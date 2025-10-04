'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import OfferForm from '@/components/admin/offer-form';
import { 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Copy,
  BarChart3,
  Calendar,
  Users,
  DollarSign,
  Percent,
  Gift,
  Truck,
  Tag,
  Clock,
  Star,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Offer {
  id: string;
  title: string;
  description: string;
  code: string;
  type: 'percentage' | 'fixed' | 'shipping' | 'bogo';
  value: number;
  minAmount: number;
  maxDiscount?: number;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  categories: string[];
  brands: string[];
  products: string[];
  usageLimit?: number;
  usageCount: number;
  userUsageLimit: number;
  newCustomerOnly: boolean;
  applicableUserRoles: string[];
  status: 'active' | 'inactive' | 'expired' | 'scheduled' | 'exhausted';
  remainingUsage?: number;
  usagePercentage: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

interface OffersData {
  offers: Offer[];
  stats: {
    total: number;
    active: number;
    expired: number;
    filtered: number;
  };
}

interface FilterState {
  search: string;
  type: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    filtered: 0
  });
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, [filters]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.type) params.append('type', filters.type);
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'active') {
          params.append('active', 'true');
        } else if (filters.status === 'inactive') {
          params.append('active', 'false');
        }
      }
      
      params.append('limit', '100');
      
      const response = await fetch(`/api/offers?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setOffers(data.data.offers);
        setStats(data.data.stats);
      } else {
        toast.error('Failed to fetch offers');
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Error fetching offers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = () => {
    setEditingOffer({
      id: '',
      title: '',
      description: '',
      code: '',
      type: 'percentage',
      value: 0,
      minAmount: 0,
      isActive: true,
      startDate: new Date().toISOString().split('T')[0],
      categories: [],
      brands: [],
      products: [],
      usageCount: 0,
      userUsageLimit: 1,
      newCustomerOnly: false,
      applicableUserRoles: ['customer'],
      status: 'active',
      usagePercentage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setShowModal(true);
  };

  const handleEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    setShowModal(true);
  };

  const handleSaveOffer = async (offerData: Partial<Offer>) => {
    try {
      const isNewOffer = !offerData.id || offerData.id === '';
      const method = isNewOffer ? 'POST' : 'PUT';
      const body = isNewOffer 
        ? { ...offerData }
        : { id: offerData.id, ...offerData };

      const response = await fetch('/api/offers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Offer ${isNewOffer ? 'created' : 'updated'} successfully`);
        setShowModal(false);
        setEditingOffer(null);
        fetchOffers();
      } else {
        toast.error(data.message || `Failed to ${isNewOffer ? 'create' : 'update'} offer`);
      }
    } catch (error) {
      console.error('Error saving offer:', error);
      toast.error('Error saving offer');
    }
  };

  const toggleOfferStatus = async (offerId: string, currentStatus: boolean) => {
    if (actionLoading) return;
    
    setActionLoading(offerId);
    try {
      const response = await fetch('/api/offers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: offerId,
          isActive: !currentStatus
        })
      });

      const data = await response.json();

      if (data.success) {
        setOffers(prev => prev.map(offer =>
          offer.id === offerId ? { ...offer, isActive: !currentStatus } : offer
        ));
        toast.success(`Offer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        toast.error(data.message || 'Failed to update offer status');
      }
    } catch (error) {
      console.error('Error toggling offer status:', error);
      toast.error('Error updating offer status');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteOffer = async (offerId: string) => {
    if (actionLoading || !confirm('Are you sure you want to delete this offer? This action cannot be undone.')) return;
    
    setActionLoading(`delete-${offerId}`);
    try {
      const response = await fetch(`/api/offers?id=${offerId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setOffers(prev => prev.filter(offer => offer.id !== offerId));
        setStats(prev => ({
          ...prev,
          total: prev.total - 1,
          filtered: prev.filtered - 1
        }));
        toast.success('Offer deleted successfully');
      } else {
        toast.error(data.message || 'Failed to delete offer');
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Error deleting offer');
    } finally {
      setActionLoading(null);
    }
  };

  const copyOfferCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Offer code copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy offer code');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'expired':
        return <Clock className="w-4 h-4 text-red-500" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'exhausted':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Tag className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4 text-orange-500" />;
      case 'fixed':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'shipping':
        return <Truck className="w-4 h-4 text-blue-500" />;
      case 'bogo':
        return <Gift className="w-4 h-4 text-purple-500" />;
      default:
        return <Tag className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatValue = (offer: Offer) => {
    switch (offer.type) {
      case 'percentage':
        return `${offer.value}%`;
      case 'fixed':
        return `₹${offer.value}`;
      case 'shipping':
        return 'Free Shipping';
      case 'bogo':
        return 'BOGO';
      default:
        return offer.value.toString();
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
                    <div className="h-12 bg-gray-300 rounded w-64"></div>
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Offer Management</h1>
            <p className="text-gray-600 mt-1">Create and manage promotional offers and discount codes</p>
          </div>
          <button
            onClick={handleCreateOffer}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Offer
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Offers</h3>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Active Offers</h3>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Expired</h3>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <Clock className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Usage Rate</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {offers.length > 0 ? Math.round(offers.reduce((acc, offer) => acc + offer.usagePercentage, 0) / offers.length) : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search offers by title, code, or description..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
              <option value="shipping">Free Shipping</option>
              <option value="bogo">BOGO</option>
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <button
              onClick={() => setFilters({
                search: '',
                type: '',
                status: '',
                sortBy: 'createdAt',
                sortOrder: 'desc'
              })}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Offers Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">All Offers ({offers.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Offer Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {offers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {offer.title}
                            </p>
                            {offer.newCustomerOnly && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                <Star className="w-3 h-3 mr-1" />
                                New Customer
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 font-mono">
                              {offer.code}
                            </span>
                            <button
                              onClick={() => copyOfferCode(offer.code)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {offer.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(offer.type)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatValue(offer)}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {offer.type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {offer.usageCount} {offer.usageLimit && `/ ${offer.usageLimit}`}
                      </div>
                      {offer.usageLimit && (
                        <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all" 
                            style={{ width: `${Math.min(offer.usagePercentage, 100)}%` }}
                          ></div>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(offer.status)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          offer.status === 'active' ? 'bg-green-100 text-green-800' :
                          offer.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          offer.status === 'expired' ? 'bg-red-100 text-red-800' :
                          offer.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {offer.status}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(offer.startDate).toLocaleDateString()}
                        </div>
                        {offer.endDate && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(offer.endDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditOffer(offer)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit offer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => toggleOfferStatus(offer.id, offer.isActive)}
                          disabled={actionLoading === offer.id}
                          className={`${
                            offer.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'
                          } ${actionLoading === offer.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={offer.isActive ? 'Deactivate offer' : 'Activate offer'}
                        >
                          {offer.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={() => deleteOffer(offer.id)}
                          disabled={actionLoading === `delete-${offer.id}`}
                          className={`text-red-600 hover:text-red-900 ${
                            actionLoading === `delete-${offer.id}` ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Delete offer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {offers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No offers found</h3>
                        <p className="mb-6">Create your first promotional offer to get started.</p>
                        <button
                          onClick={handleCreateOffer}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Create New Offer
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for creating/editing offers */}
      {showModal && editingOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingOffer.id ? 'Edit Offer' : 'Create New Offer'}
            </h2>
            <OfferForm
              initialValues={editingOffer}
              onCancel={() => {
                setShowModal(false);
                setEditingOffer(null);
              }}
              onSubmit={async (vals) => {
                await handleSaveOffer(vals as any);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}