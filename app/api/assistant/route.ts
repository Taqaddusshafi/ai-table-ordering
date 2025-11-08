import { NextRequest, NextResponse } from 'next/server'
import { getGeminiModel } from '@/lib/gemini/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs' // Required for Gemini SDK

type MemoryItem = {
  last_action: string
  last_items: any[]
  last_total: number
}
const memory: Record<string, MemoryItem> = {}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json()

    if (!message || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing message or sessionId' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Fetch menu items with categories
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, price, category')
      .eq('available', true)

    if (menuError || !menuItems?.length) {
      console.error('Menu fetch error:', menuError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch menu' },
        { status: 500 }
      )
    }

    // Group menu by category for prompt formatting
    const grouped = menuItems.reduce((acc: Record<string, any[]>, item) => {
      acc[item.category] = acc[item.category] || []
      acc[item.category].push(item)
      return acc
    }, {})

    const formattedMenu = Object.entries(grouped)
      .map(([category, items]) => {
        const list = items
          .map(i => `${i.name} (₹${i.price})`)
          .join(', ')
        return `${category}: ${list}`
      })
      .join('\n')

    // Include previous session memory context if available
    const previous = memory[sessionId]
    let memoryContext = ''
    if (previous?.last_items?.length > 0) {
      memoryContext = `
PREVIOUS CONTEXT:
Last customer order:
${JSON.stringify(previous.last_items, null, 2)}
Last action: ${previous.last_action}
Total amount: ₹${previous.last_total}
Customer’s new message: "${message}"
`
    }

    // Build menu JSON array for AI prompt (ids, names, prices)
    const menuJson = menuItems
      .map(i => `{"id":"${i.id}","name":"${i.name}","price":${i.price}}`)
      .join(',')

    // Construct full Gemini AI prompt
    const fullPrompt = `
You are a helpful restaurant AI ordering assistant.

Your goal is to help customers view the menu, place orders, confirm them, and proceed to payment.

RULES:
1. Respond ONLY in valid JSON — no extra text or markdown.
2. Always use exact IDs, names, and prices from the provided menu.
3. Never invent new items, categories, or prices.
4. If user says something like "show menu", "menu", "options", or "list items",
   respond with "action": "greet" and show the full menu (in "message").
5. If user says "recommend" or "suggest", respond with 2–3 recommended items
   based on popular or random menu choices — "action": "greet".
6. If user places an order (like "1 coke" or "I want pizza"),
   respond with "action": "confirm" and show order summary.
7. If previous action was "confirm" and user says "yes"/"ok"/"confirm",
   respond with "action": "payment" — keep SAME items and total.
8. If unclear, respond with "action": "clarify".
9. total_amount = sum(price × quantity).
10. Do not include markdown, emojis, or text outside JSON.

AVAILABLE MENU (grouped by category):
${formattedMenu}

AVAILABLE MENU JSON:
[${menuJson}]

${memoryContext}

CUSTOMER MESSAGE: "${message}"

Return ONLY valid JSON in this format:
{
  "message": "string",
  "items": [{"id": "uuid", "name": "item name", "quantity": 1, "price": 100}],
  "action": "confirm" | "payment" | "clarify" | "greet",
  "total_amount": 200,
  "needs_clarification": false
}
`

    // Call Gemini model to generate response
    const model = getGeminiModel()
    const result = await model.generateContent(fullPrompt)
    const response = result.response
    let text = (await response.text()).trim()

    // Extract JSON part from AI response safely
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start > -1 && end > start) {
      text = text.substring(start, end + 1)
    }

    let aiResponse
    try {
      aiResponse = JSON.parse(text)
    } catch (err) {
      console.error('Invalid JSON from Gemini:', text)
      aiResponse = {
        message: "Sorry, I couldn't understand that. Please choose from our available menu.",
        items: [],
        action: 'clarify',
        total_amount: 0,
        needs_clarification: true,
      }
    }

    // Validate that items returned exist in our menu by ID
    const validIds = new Set(menuItems.map(i => i.id))
    aiResponse.items = (aiResponse.items || []).filter((i: any) => validIds.has(i.id))

    // Recalculate total_amount if missing or zero
    if (!aiResponse.total_amount || aiResponse.total_amount <= 0) {
      aiResponse.total_amount = aiResponse.items.reduce(
        (sum: number, item: any) => sum + (Number(item.price) || 0) * (item.quantity ?? 1),
        0
      )
    }

    // Update memory state for session
    memory[sessionId] = {
      last_action: aiResponse.action,
      last_items: aiResponse.items || [],
      last_total: aiResponse.total_amount || 0,
    }

    return NextResponse.json({ success: true, data: aiResponse })
  } catch (error: any) {
    console.error('Gemini error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
