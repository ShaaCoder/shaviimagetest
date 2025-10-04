'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  productCount: number;
  metaTitle?: string;
  metaDescription?: string;
  isGenerated?: boolean;
}

interface BrandsData {
  brands: Brand[];
  total: number;
  managed: number;
  generated: number;
  featured: number;
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Omit<BrandsData, 'brands'>>({
    total: 0,
    managed: 0,
    generated: 0,
    featured: 0
  });
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brands?limit=100');
      const data = await response.json();

      if (data.success) {
        setBrands(data.data.brands);
        setStats({
          total: data.data.total,
          managed: data.data.managed,
          generated: data.data.generated,
          featured: data.data.featured
        });
      } else {
        toast.error('Failed to fetch brands');
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast.error('Error fetching brands');
    } finally {
      setLoading(false);
    }
  };

  const toggleBrandStatus = async (brandId: string, currentStatus: boolean) => {
    if (actionLoading) return;
    
    setActionLoading(brandId);
    try {
      const response = await fetch('/api/brands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: brandId,
          isActive: !currentStatus
        })
      });

      const data = await response.json();

      if (data.success) {
        setBrands(prev => prev.map(brand =>
          brand.id === brandId ? { ...brand, isActive: !currentStatus } : brand
        ));
        toast.success(`Brand ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        toast.error(data.message || 'Failed to update brand status');
      }
    } catch (error) {
      console.error('Error toggling brand status:', error);
      toast.error('Error updating brand status');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFeaturedStatus = async (brandId: string, currentStatus: boolean) => {
    if (actionLoading) return;
    
    setActionLoading(`featured-${brandId}`);
    try {
      const response = await fetch('/api/brands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: brandId,
          isFeatured: !currentStatus
        })
      });

      const data = await response.json();

      if (data.success) {
        setBrands(prev => prev.map(brand =>
          brand.id === brandId ? { ...brand, isFeatured: !currentStatus } : brand
        ));
        setStats(prev => ({
          ...prev,
          featured: prev.featured + (!currentStatus ? 1 : -1)
        }));
        toast.success(`Brand ${!currentStatus ? 'marked as featured' : 'removed from featured'}`);
      } else {
        toast.error(data.message || 'Failed to update featured status');
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast.error('Error updating featured status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditBrand = (brand: Brand) => {
    if (brand.isGenerated) {
      // For generated brands, create a new managed brand
      setEditingBrand({
        ...brand,
        id: '',
        isGenerated: false
      });
    } else {
      setEditingBrand(brand);
    }
    setShowModal(true);
  };

  const handleSaveBrand = async (brandData: Partial<Brand>) => {
    try {
      const isNewBrand = !brandData.id || brandData.id === '';
      const method = isNewBrand ? 'POST' : 'PUT';
      const body = isNewBrand 
        ? { ...brandData }
        : { id: brandData.id, ...brandData };

      const response = await fetch('/api/brands', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Brand ${isNewBrand ? 'created' : 'updated'} successfully`);
        setShowModal(false);
        setEditingBrand(null);
        fetchBrands(); // Refresh the list
      } else {
        toast.error(data.message || `Failed to ${isNewBrand ? 'create' : 'update'} brand`);
      }
    } catch (error) {
      console.error('Error saving brand:', error);
      toast.error('Error saving brand');
    }
  };

  const deleteBrand = async (brandId: string) => {
    if (actionLoading || !confirm('Are you sure you want to delete this brand?')) return;
    
    setActionLoading(`delete-${brandId}`);
    try {
      const response = await fetch(`/api/brands?id=${brandId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        if (data.data?.deactivated) {
          setBrands(prev => prev.map(brand =>
            brand.id === brandId ? { ...brand, isActive: false } : brand
          ));
          toast.success(`Brand deactivated (has ${data.data.productCount} products)`);
        } else {
          setBrands(prev => prev.filter(brand => brand.id !== brandId));
          toast.success('Brand deleted successfully');
        }
      } else {
        toast.error(data.message || 'Failed to delete brand');
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error('Error deleting brand');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="h-4 bg-gray-300 rounded w-16 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-12"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 py-4 border-b">
                    <div className="w-12 h-12 bg-gray-300 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-48"></div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-gray-300 rounded w-16"></div>
                      <div className="h-8 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Brand Management</h1>
          <button
            onClick={() => {
              setEditingBrand({
                id: '',
                name: '',
                slug: '',
                description: '',
                logo: '',
                website: '',
                isActive: true,
                isFeatured: false,
                sortOrder: 0,
                productCount: 0
              });
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add New Brand
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Brands</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Managed</h3>
            <p className="text-2xl font-bold text-green-600">{stats.managed}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Auto-Generated</h3>
            <p className="text-2xl font-bold text-orange-600">{stats.generated}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Featured</h3>
            <p className="text-2xl font-bold text-purple-600">{stats.featured}</p>
          </div>
        </div>

        {/* Brands Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">All Brands</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Featured
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {brands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {brand.logo && brand.logo !== '/placeholder-image.svg' ? (
                            <Image
                              src={brand.logo}
                              alt={brand.name}
                              width={48}
                              height={48}
                              className="h-12 w-12 object-contain rounded-lg border border-gray-200"
                              unoptimized={brand.logo.startsWith('http')}
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 font-bold text-lg">
                              {brand.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                          {brand.description && (
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {brand.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {brand.productCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleBrandStatus(brand.id, brand.isActive)}
                        disabled={actionLoading === brand.id}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          brand.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        } ${actionLoading === brand.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {actionLoading === brand.id ? 'Updating...' : (brand.isActive ? 'Active' : 'Inactive')}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleFeaturedStatus(brand.id, brand.isFeatured)}
                        disabled={actionLoading === `featured-${brand.id}` || brand.isGenerated}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          brand.isFeatured
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        } ${
                          actionLoading === `featured-${brand.id}` || brand.isGenerated 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'cursor-pointer'
                        }`}
                      >
                        {actionLoading === `featured-${brand.id}` 
                          ? 'Updating...' 
                          : (brand.isFeatured ? 'Featured' : 'Not Featured')
                        }
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        brand.isGenerated 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {brand.isGenerated ? 'Auto' : 'Managed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditBrand(brand)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        {!brand.isGenerated && (
                          <button
                            onClick={() => deleteBrand(brand.id)}
                            disabled={actionLoading === `delete-${brand.id}`}
                            className={`text-red-600 hover:text-red-900 ${
                              actionLoading === `delete-${brand.id}` ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {actionLoading === `delete-${brand.id}` ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Brand Modal */}
      {showModal && editingBrand && (
        <BrandEditModal
          brand={editingBrand}
          onClose={() => {
            setShowModal(false);
            setEditingBrand(null);
          }}
          onSave={handleSaveBrand}
        />
      )}
    </div>
  );
}

// Brand Edit Modal Component
function BrandEditModal({
  brand,
  onClose,
  onSave
}: {
  brand: Brand;
  onClose: () => void;
  onSave: (brandData: Partial<Brand>) => void;
}) {
  const [formData, setFormData] = useState({
    name: brand.name || '',
    slug: brand.slug || '', // Include slug field
    description: brand.description || '',
    logo: brand.logo || '',
    website: brand.website || '',
    isFeatured: brand.isFeatured || false,
    sortOrder: brand.sortOrder || 0,
    metaTitle: brand.metaTitle || '',
    metaDescription: brand.metaDescription || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...brand,
      ...formData
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {brand.id ? 'Edit Brand' : 'Create New Brand'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  name: newName,
                  // Auto-generate slug from name if slug is empty
                  slug: prev.slug || newName
                    .toLowerCase()
                    .trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/[\s_-]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (URL-friendly name)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="[a-z0-9-]+"
              placeholder="auto-generated-from-name"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to auto-generate from brand name. Use only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              value={formData.logo}
              onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://brand-website.com"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Featured Brand</span>
            </label>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Title (SEO)
            </label>
            <input
              type="text"
              value={formData.metaTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Description (SEO)
            </label>
            <textarea
              value={formData.metaDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={160}
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {brand.id ? 'Update Brand' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}