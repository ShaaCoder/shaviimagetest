'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  Printer, 
  Mail,
  MapPin,
  Truck,
  Package,
  Calendar,
  Phone,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  FileCheck,
  Send,
  Eye,
  Maximize2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface InvoiceGeneratorProps {
  order: {
    id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      image?: string;
    }>;
    shippingAddress: {
      name: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
    };
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
    trackingNumber?: string;
    carrier?: string;
    expectedDeliveryAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    shippingDetails?: {
      courierName: string;
      estimatedDeliveryTime: string;
      courierRating?: number;
      codCharge?: number;
      awbCode?: string;
    };
  };
  companyDetails?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin?: string;
    website?: string;
  };
  compact?: boolean; // New prop for compact mode
}

export function InvoiceGenerator({ 
  order, 
  compact = false,
  companyDetails = {
    name: 'BrandAndOffer',
    address: 'H-653 Gram sabha pooth kalan, sanjeevni hospital, North West Delhi, Delhi - 110086',
    phone: '+91-7835996416',
    email: 'kavinswebstudio@gmail.com',
    gstin: 'GST123456789',
    website: 'www.brandandoffer.com'
  }
}: InvoiceGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateInvoice = async (action: 'download' | 'print' | 'email') => {
    setIsGenerating(true);
    
    try {
      // Create the invoice HTML
      const invoiceHtml = generateInvoiceHtml();
      
      if (action === 'print') {
        // Open print dialog
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(invoiceHtml);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      } else if (action === 'download') {
        // Download as HTML file (could be enhanced to PDF)
        const blob = new Blob([invoiceHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${order.orderNumber}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (action === 'email') {
        // Send via email (would need API endpoint)
        toast.info('Email feature coming soon!');
      }
      
      toast.success(`Invoice ${action}ed successfully!`);
    } catch (error) {
      toast.error(`Failed to ${action} invoice`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateInvoiceHtml = () => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${order.orderNumber}</title>
    <style>
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937; 
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
        }
        
        .invoice-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
        }
        
        .invoice-header { 
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 40px;
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
        }
        
        .company-details h1 { 
            font-size: 36px; 
            font-weight: 800;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .company-details p { 
            font-size: 14px; 
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 4px;
        }
        
        .invoice-info { 
            text-align: right; 
        }
        
        .invoice-info h2 { 
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 16px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .invoice-number { 
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            color: white;
            padding: 10px 20px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 16px;
            display: inline-block;
            margin-bottom: 16px;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .invoice-info p {
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 6px;
        }
        
        .content-section {
            padding: 40px;
        }
        
        .addresses { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 40px; 
            margin-bottom: 40px; 
        }
        
        .address-block {
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            border: 1px solid #e2e8f0;
        }
        
        .address-block h3 { 
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin: -24px -24px 16px -24px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
        }
        
        .address-block p {
            margin-bottom: 6px;
            font-size: 14px;
        }
        
        .address-block p:first-of-type {
            font-weight: 700;
            font-size: 16px;
            color: #1f2937;
        }
        
        .delivery-info {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 2px solid #3b82f6;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
            position: relative;
            overflow: hidden;
        }
        
        .delivery-info::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #3b82f6, #1d4ed8, #3b82f6);
        }
        
        .delivery-info h3 {
            color: #1d4ed8;
            margin-bottom: 20px;
            font-size: 20px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .delivery-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
        }
        
        .delivery-item {
            background: white;
            padding: 16px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: transform 0.2s;
        }
        
        .delivery-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }
        
        .delivery-item strong {
            color: #374151;
            font-size: 14px;
        }
        
        .delivery-item span {
            color: #1f2937;
            font-weight: 600;
        }
        
        .status-badges {
            display: flex;
            gap: 12px;
            margin: 24px 0;
            justify-content: center;
        }
        
        .badge {
            padding: 10px 20px;
            border-radius: 50px;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 2px solid;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        
        .badge.confirmed { background: #dcfce7; color: #166534; border-color: #22c55e; }
        .badge.shipped { background: #dbeafe; color: #1d4ed8; border-color: #3b82f6; }
        .badge.delivered { background: #dcfce7; color: #166534; border-color: #22c55e; }
        .badge.paid { background: #dcfce7; color: #166534; border-color: #22c55e; }
        .badge.pending { background: #fef3c7; color: #d97706; border-color: #f59e0b; }
        .badge.cod { background: #fef2f2; color: #dc2626; border-color: #ef4444; }
        
        .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 32px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .items-table thead {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            color: white;
        }
        
        .items-table th { 
            padding: 20px 16px;
            text-align: left;
            font-weight: 700;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-table tbody tr {
            border-bottom: 1px solid #f3f4f6;
            transition: background-color 0.2s;
        }
        
        .items-table tbody tr:hover { 
            background: #f8fafc; 
        }
        
        .items-table tbody tr:last-child {
            border-bottom: none;
        }
        
        .items-table td { 
            padding: 16px; 
            font-size: 14px;
        }
        
        .items-table td:first-child {
            font-weight: 600;
            color: #1f2937;
        }
        
        .total-section { 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 32px;
            border-radius: 16px;
            margin-top: 32px;
            border: 1px solid #e2e8f0;
        }
        
        .total-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin-bottom: 12px;
            padding: 8px 0;
            font-size: 16px;
        }
        
        .total-row.final { 
            border-top: 3px solid #3b82f6;
            padding-top: 20px;
            margin-top: 16px;
            font-weight: 800;
            font-size: 24px;
            color: #1f2937;
            background: white;
            margin: 16px -32px -32px -32px;
            padding: 20px 32px;
            border-radius: 0 0 16px 16px;
        }
        
        .footer {
            background: #f8fafc;
            margin: 0 -40px;
            padding: 32px 40px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer h4 {
            color: #1f2937;
            font-size: 18px;
            margin-bottom: 12px;
        }
        
        .footer p {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .footer .disclaimer {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        @media print {
            body { 
                background: white;
                padding: 0;
            }
            .invoice-container {
                box-shadow: none;
                border-radius: 0;
            }
            .addresses { page-break-inside: avoid; }
            .items-table { page-break-inside: avoid; }
            .total-section { page-break-inside: avoid; }
        }
        
        @media (max-width: 768px) {
            body { padding: 20px 10px; }
            .invoice-header { 
                flex-direction: column;
                gap: 24px;
                text-align: center;
            }
            .invoice-info { text-align: center; }
            .addresses { 
                grid-template-columns: 1fr;
                gap: 20px;
            }
            .content-section { padding: 20px; }
            .footer { padding: 20px; margin: 0 -20px; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="company-details">
                <h1>${companyDetails.name}</h1>
                <p>${companyDetails.address}</p>
                <p>Phone: ${companyDetails.phone}</p>
                <p>Email: ${companyDetails.email}</p>
                ${companyDetails.gstin ? `<p>GSTIN: ${companyDetails.gstin}</p>` : ''}
                ${companyDetails.website ? `<p>Website: ${companyDetails.website}</p>` : ''}
            </div>
            <div class="invoice-info">
                <h2>INVOICE</h2>
                <div class="invoice-number">${order.orderNumber}</div>
                <p><strong>Issue Date:</strong> ${formatDate(order.createdAt)}</p>
                ${order.shippedAt ? `<p><strong>Shipped:</strong> ${formatDate(order.shippedAt)}</p>` : ''}
                ${order.deliveredAt ? `<p><strong>Delivered:</strong> ${formatDate(order.deliveredAt)}</p>` : ''}
            </div>
        </div>

        <div class="content-section">
            <div class="addresses">
                <div class="address-block">
                    <h3>📨 Bill To</h3>
                    <p>${order.shippingAddress.name}</p>
                    <p>${order.shippingAddress.address}</p>
                    <p>${order.shippingAddress.city}, ${order.shippingAddress.state}</p>
                    <p>PIN: ${order.shippingAddress.pincode}</p>
                    <p>Phone: ${order.shippingAddress.phone}</p>
                </div>
                <div class="address-block">
                    <h3>🚚 Ship To</h3>
                    <p>${order.shippingAddress.name}</p>
                    <p>${order.shippingAddress.address}</p>
                    <p>${order.shippingAddress.city}, ${order.shippingAddress.state}</p>
                    <p>PIN: ${order.shippingAddress.pincode}</p>
                    <p>Phone: ${order.shippingAddress.phone}</p>
                </div>
            </div>

            ${order.trackingNumber || order.shippingDetails ? `
            <div class="delivery-info">
                <h3>🚚 Delivery Information</h3>
                <div class="delivery-details">
                    ${order.trackingNumber ? `
                    <div class="delivery-item">
                        <strong>Tracking Number:</strong>
                        <span>${order.trackingNumber}</span>
                    </div>
                    ` : ''}
                    ${order.carrier || order.shippingDetails?.courierName ? `
                    <div class="delivery-item">
                        <strong>Courier Partner:</strong>
                        <span>${order.carrier || order.shippingDetails?.courierName || 'N/A'}</span>
                    </div>
                    ` : ''}
                    ${order.expectedDeliveryAt || order.shippingDetails?.estimatedDeliveryTime ? `
                    <div class="delivery-item">
                        <strong>Expected Delivery:</strong>
                        <span>${order.expectedDeliveryAt ? formatDate(order.expectedDeliveryAt) : order.shippingDetails?.estimatedDeliveryTime || 'N/A'}</span>
                    </div>
                    ` : ''}
                    ${order.shippingDetails?.awbCode ? `
                    <div class="delivery-item">
                        <strong>AWB Number:</strong>
                        <span>${order.shippingDetails.awbCode}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <div class="status-badges">
                <span class="badge ${order.status === 'delivered' ? 'delivered' : order.status === 'shipped' ? 'shipped' : 'confirmed'}">
                    ✓ Order ${order.status}
                </span>
                <span class="badge ${order.paymentStatus === 'completed' ? 'paid' : order.paymentMethod === 'cod' ? 'cod' : 'pending'}">
                    ${order.paymentStatus === 'completed' ? '💳 Paid' : order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '⏳ Payment ' + order.paymentStatus}
                </span>
            </div>

            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item Description</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td style="text-align: center;">${item.quantity}</td>
                        <td style="text-align: right;">₹${item.price.toFixed(2)}</td>
                        <td style="text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="total-section">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>₹${order.subtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span>Shipping & Handling:</span>
                    <span>₹${order.shipping.toFixed(2)}</span>
                </div>
                ${order.shippingDetails?.codCharge && order.shippingDetails.codCharge > 0 ? `
                <div class="total-row">
                    <span>COD Charges:</span>
                    <span>₹${order.shippingDetails.codCharge.toFixed(2)}</span>
                </div>
                ` : ''}
                ${order.discount > 0 ? `
                <div class="total-row" style="color: #16a34a;">
                    <span>Discount:</span>
                    <span>-₹${order.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-row final">
                    <span>Total Amount:</span>
                    <span>₹${order.total.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <h4>Thank you for shopping with ${companyDetails.name}!</h4>
            <p>For any queries, please contact us at ${companyDetails.phone} or ${companyDetails.email}</p>
            ${companyDetails.website ? `<p>Visit us at ${companyDetails.website}</p>` : ''}
            <div class="disclaimer">
                <p>This is a computer-generated invoice and does not require a signature.</p>
                <p>Please retain this invoice for your records.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'text-green-600 bg-green-50 border-green-200';
      case 'shipped': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'confirmed': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'confirmed': return <FileCheck className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getPaymentStatusColor = (status: string, method: string) => {
    if (status === 'completed') return 'text-green-600 bg-green-50 border-green-200';
    if (method === 'cod') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  // Compact version for sidebar
  if (compact) {
    return (
      <>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Invoice Generator</h3>
                  <p className="text-xs text-gray-500">Professional invoices made easy</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Compact Order Info */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border">
                <p className="text-xs text-gray-600 mb-1">Order #</p>
                <p className="font-mono text-sm font-bold text-gray-900 truncate">{order.orderNumber}</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border">
                <p className="text-xs text-gray-600 mb-1">Total</p>
                <p className="font-bold text-sm text-gray-900">₹{order.total.toFixed(2)}</p>
              </div>
            </div>

            <div className="text-center mb-4">
              <Badge 
                className={`${getStatusColor(order.status)} border font-medium px-3 py-1 rounded-full text-xs`}
                variant="outline"
              >
                {getStatusIcon(order.status)}
                <span className="ml-1 capitalize">{order.status}</span>
              </Badge>
            </div>

            {/* Compact Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => generateInvoice('download')}
                disabled={isGenerating}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-medium"
              >
                {isGenerating ? (
                  <Clock className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
              </Button>
              
              <Button
                onClick={() => generateInvoice('print')}
                disabled={isGenerating}
                size="sm"
                variant="outline"
                className="text-xs font-medium"
              >
                <Printer className="w-3 h-3" />
              </Button>
              
              <Button
                onClick={() => generateInvoice('email')}
                disabled={isGenerating}
                size="sm"
                variant="outline"
                className="text-xs font-medium"
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>

            <div className="text-xs text-gray-500 mt-3 space-y-1">
              <p>• Complete delivery information included</p>
              <p>• Professional format for business use</p>
            </div>
          </CardContent>
        </Card>

        {/* Full Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Generator - Order #{order.orderNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <InvoiceGenerator order={order} companyDetails={companyDetails} compact={false} />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full version (original design)
  return (
    <div className="space-y-6">
      {/* Modern Header Card */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                <FileText className="w-6 h-6" />
              </div>
              Invoice Generator
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span>Professional invoices made easy</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Enhanced Order Summary */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Order Number */}
            <div className="group p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <p className="text-sm font-medium text-gray-600">Order Number</p>
              </div>
              <p className="font-mono font-bold text-lg text-gray-900">{order.orderNumber}</p>
            </div>

            {/* Order Date */}
            <div className="group p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="text-sm font-medium text-gray-600">Order Date</p>
              </div>
              <p className="font-semibold text-gray-900">{formatDate(order.createdAt)}</p>
            </div>

            {/* Total Amount */}
            <div className="group p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <CreditCard className="w-4 h-4" />
                </div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
              </div>
              <p className="font-bold text-xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ₹{order.total.toFixed(2)}
              </p>
            </div>

            {/* Status */}
            <div className="group p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  {getStatusIcon(order.status)}
                </div>
                <p className="text-sm font-medium text-gray-600">Status</p>
              </div>
              <Badge 
                className={`${getStatusColor(order.status)} border font-semibold px-3 py-1 rounded-full text-sm capitalize`}
                variant="outline"
              >
                {order.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Delivery Information */}
      {(order.trackingNumber || order.shippingDetails) && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-1">
            <div className="bg-white rounded-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Delivery Information</h3>
                    <p className="text-sm text-gray-500">Track your shipment details</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {order.trackingNumber && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tracking Number</p>
                        <code className="font-mono text-sm font-bold text-gray-900">{order.trackingNumber}</code>
                      </div>
                    </div>
                  )}
                  
                  {(order.carrier || order.shippingDetails?.courierName) && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="p-2 rounded-lg bg-green-100 text-green-600">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Courier Partner</p>
                        <p className="font-semibold text-gray-900">{order.carrier || order.shippingDetails?.courierName}</p>
                      </div>
                    </div>
                  )}
                  
                  {(order.expectedDeliveryAt || order.shippingDetails?.estimatedDeliveryTime) && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expected Delivery</p>
                        <p className="font-semibold text-gray-900">
                          {order.expectedDeliveryAt ? formatDate(order.expectedDeliveryAt) : order.shippingDetails?.estimatedDeliveryTime}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      )}

      {/* Payment Status Card */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl border ${getPaymentStatusColor(order.paymentStatus, order.paymentMethod)}`}>
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Payment Status</h3>
                <p className="text-sm text-gray-500">Payment method: {order.paymentMethod?.toUpperCase() || 'N/A'}</p>
              </div>
            </div>
            <Badge 
              className={`${getPaymentStatusColor(order.paymentStatus, order.paymentMethod)} border font-semibold px-4 py-2 rounded-full text-sm capitalize`}
              variant="outline"
            >
              {order.paymentStatus === 'completed' ? 'Paid' : 
               order.paymentMethod === 'cod' ? 'Cash on Delivery' : 
               `Payment ${order.paymentStatus}`}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Action Buttons */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => generateInvoice('download')}
              disabled={isGenerating}
              className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              size="lg"
            >
              {isGenerating ? (
                <Clock className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Download className="w-5 h-5 mr-2" />
              )}
              Download Invoice
            </Button>
            
            <Button
              onClick={() => generateInvoice('print')}
              disabled={isGenerating}
              className="flex-1 h-12 text-base font-semibold border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 transform hover:scale-[1.02]"
              variant="outline"
              size="lg"
            >
              <Printer className="w-5 h-5 mr-2" />
              Print Invoice
            </Button>
            
            <Button
              onClick={() => generateInvoice('email')}
              disabled={isGenerating}
              className="flex-1 h-12 text-base font-semibold border-2 border-green-300 hover:border-green-400 text-green-700 hover:text-green-900 hover:bg-green-50 transition-all duration-200 transform hover:scale-[1.02]"
              variant="outline"
              size="lg"
            >
              <Send className="w-5 h-5 mr-2" />
              Email Invoice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Features Info */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Invoice Features</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/50 border border-white/20">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Complete Delivery Info</p>
                <p className="text-xs text-gray-500">Includes tracking numbers and courier details</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/50 border border-white/20">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Professional Format</p>
                <p className="text-xs text-gray-500">Beautifully designed for business use</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/50 border border-white/20">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Record Keeping</p>
                <p className="text-xs text-gray-500">Perfect for customer support and accounting</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}