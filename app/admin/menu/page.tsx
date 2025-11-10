'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, Save, X, ArrowLeft, Tag } from 'lucide-react'
import Link from 'next/link'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string
  available: boolean
}

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    available: true,
  })
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const router = useRouter()

  // Get unique categories from existing menu items
  const existingCategories = [...new Set(menuItems.map(item => item.category))].sort()

  // Predefined common categories
  const commonCategories = [
    'Burgers',
    'Pizza',
    'Pasta',
    'Desserts',
    'Beverages',
    'Appetizers',
    'Salads',
    'Sandwiches',
    'Soups',
    'Main Course',
    'Sides',
    'Breakfast',
    'Indian',
    'Chinese',
    'Continental',
    'Seafood',
    'Vegetarian',
    'Non-Vegetarian',
  ]

  // Merge existing and common categories, remove duplicates
  const allCategories = [...new Set([...existingCategories, ...commonCategories])].sort()

  useEffect(() => {
    checkAuthAndFetch()
  }, [])

  const checkAuthAndFetch = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push('/admin/login')
      return
    }

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', session.user.email)
      .single()

    if (!adminData) {
      toast.error('Unauthorized')
      router.push('/admin/login')
      return
    }

    fetchMenuItems()
  }

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu')
      const result = await response.json()
      if (result.success) {
        setMenuItems(result.data)
      }
    } catch (error) {
      toast.error('Failed to load menu items')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Use custom category if provided, otherwise use selected category
    const categoryToUse = showCustomCategory && customCategory.trim()
      ? customCategory.trim()
      : formData.category

    if (!categoryToUse) {
      toast.error('Please select or enter a category')
      return
    }

    try {
      const dataToSubmit = {
        ...formData,
        category: categoryToUse,
      }

      const response = await fetch('/api/menu', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...dataToSubmit } : dataToSubmit),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(editingId ? 'Item updated!' : 'Item added!')
        fetchMenuItems()
        resetForm()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = (item: MenuItem) => {
    setEditingId(item.id)
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image_url: item.image_url,
      available: item.available,
    })
    setShowCustomCategory(false)
    setCustomCategory('')
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const response = await fetch(`/api/menu?id=${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Item deleted!')
        fetchMenuItems()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image_url: '',
      available: true,
    })
    setCustomCategory('')
    setShowCustomCategory(false)
    setEditingId(null)
    setShowAddForm(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              🍽️ Menu Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {menuItems.length} items • {existingCategories.length} categories
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="e.g., Margherita Pizza"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="199"
                />
              </div>

              {/* Category Selection */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category *
                </label>
                
                {!showCustomCategory ? (
                  <div className="space-y-2">
                    <select
                      required={!showCustomCategory}
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCustomCategory(true)}
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      <Tag className="w-4 h-4" />
                      Or create new category
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      required={showCustomCategory}
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder="Enter new category name"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomCategory(false)
                        setCustomCategory('')
                      }}
                      className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-700 font-semibold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Choose from existing categories
                    </button>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  rows={3}
                  placeholder="Delicious pizza with fresh mozzarella..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-600"
                />
                <label htmlFor="available" className="text-sm font-semibold text-gray-700">
                  Available for ordering
                </label>
              </div>

              <div className="sm:col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingId ? 'Update Item' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Category Filters */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          <button
            onClick={() => {/* Filter logic */}}
            className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-full font-semibold"
          >
            All ({menuItems.length})
          </button>
          {existingCategories.map((cat) => (
            <button
              key={cat}
              className="flex-shrink-0 px-4 py-2 bg-white border border-gray-200 rounded-full font-semibold hover:bg-gray-50 transition-colors"
            >
              {cat} ({menuItems.filter(item => item.category === cat).length})
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                    <p className="text-sm text-blue-600 font-medium">{item.category}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    item.available
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {item.available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {item.description || 'No description'}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-blue-600">₹{item.price}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {menuItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">🍽️</p>
            <p className="text-gray-600">No menu items yet. Add your first item!</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
