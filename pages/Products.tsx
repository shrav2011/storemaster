import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, runTransaction, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { Plus, Search, Edit2, Trash2, DollarSign, X, AlertCircle } from 'lucide-react';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    name: '', category: '', priceBuy: '', priceSell: '', stock: ''
  });
  const [sellQuantity, setSellQuantity] = useState('1');
  const [formError, setFormError] = useState('');

  // Real-time listener for products
  useEffect(() => {
    if (!db) {
        setLoading(false);
        return;
    }
    const q = query(collection(db, 'products'), orderBy('name'));
    // Fix: cast snapshot to any to avoid incorrect DocumentSnapshot inference
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const prods: Product[] = [];
      snapshot.forEach((doc: any) => {
        prods.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(prods);
      setLoading(false);
    }, (error) => {
        console.error("Error listening to products:", error);
        setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Handlers
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({ name: '', category: '', priceBuy: '', priceSell: '', stock: '' });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      priceBuy: product.priceBuy.toString(),
      priceSell: product.priceSell.toString(),
      stock: product.stock.toString()
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenSell = (product: Product) => {
      setSellingProduct(product);
      setSellQuantity('1');
      setFormError('');
      setIsSellModalOpen(true);
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        if(db) await deleteDoc(doc(db, 'products', id));
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product.");
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setFormError('');

    const priceBuy = parseFloat(formData.priceBuy);
    const priceSell = parseFloat(formData.priceSell);
    const stock = parseInt(formData.stock);

    if (!formData.name || isNaN(priceBuy) || isNaN(priceSell) || isNaN(stock)) {
        setFormError("Please fill all fields correctly.");
        return;
    }

    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        priceBuy,
        priceSell,
        stock,
        createdAt: editingProduct ? editingProduct.createdAt : Date.now()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
      } else {
        await addDoc(collection(db, 'products'), productData);
      }
      setIsFormOpen(false);
    } catch (error: any) {
      console.error("Error saving product:", error);
      setFormError("Failed to save: " + error.message);
    }
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!db || !sellingProduct) return;

      const qty = parseInt(sellQuantity);
      if (isNaN(qty) || qty <= 0) {
          setFormError("Invalid quantity.");
          return;
      }
      if (qty > sellingProduct.stock) {
          setFormError(`Not enough stock. Only ${sellingProduct.stock} available.`);
          return;
      }

      try {
          await runTransaction(db, async (transaction) => {
              const productRef = doc(db, 'products', sellingProduct.id);
              const sfDoc = await transaction.get(productRef);
              if (!sfDoc.exists()) throw "Product does not exist!";

              const newStock = sfDoc.data().stock - qty;
              if (newStock < 0) throw "Stock too low for this transaction.";

              // Deduct stock
              transaction.update(productRef, { stock: newStock });

              // Record sale
              const saleData = {
                  productId: sellingProduct.id,
                  productName: sellingProduct.name,
                  quantity: qty,
                  totalAmount: sellingProduct.priceSell * qty,
                  profit: (sellingProduct.priceSell - sellingProduct.priceBuy) * qty,
                  date: Date.now()
              };
              const newSaleRef = doc(collection(db, 'sales'));
              transaction.set(newSaleRef, saleData);
          });
          setIsSellModalOpen(false);
      } catch (error: any) {
          console.error("Transaction failed: ", error);
          setFormError("Sale failed: " + (typeof error === 'string' ? error : error.message));
      }
  }

  // Filtered Products
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!db) return <div className="p-4 text-red-500">Database not configured.</div>;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Product Inventory</h1>
        <button
          onClick={handleOpenAdd}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search products by name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-colors"
        />
      </div>

      {/* Product Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price (Sell)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading inventory...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No products found.</td></tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.stock < 5 ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${product.priceSell}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleOpenSell(product)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/20 p-2 rounded-md transition-colors"
                        title="Sell Item"
                      >
                        <DollarSign className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(product)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 p-2 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals Backdrop */}
      {(isFormOpen || isSellModalOpen) && (
          <div className="fixed inset-0 bg-black/50 z-40 transition-opacity"></div>
      )}

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && <p className="text-red-500 text-sm">{formError}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                <input type="text" required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <input type="text" required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buying Price ($)</label>
                    <input type="number" step="0.01" min="0" required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    value={formData.priceBuy} onChange={e => setFormData({...formData, priceBuy: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selling Price ($)</label>
                    <input type="number" step="0.01" min="0" required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    value={formData.priceSell} onChange={e => setFormData({...formData, priceSell: e.target.value})} />
                </div>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Stock</label>
                  <input type="number" min="0" required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-indigo-700">
                  {editingProduct ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

       {/* Sell Modal */}
      {isSellModalOpen && sellingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Record Sale
              </h3>
              <button onClick={() => setIsSellModalOpen(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSellSubmit} className="p-6 space-y-4">
              <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Product: <span className="font-semibold text-gray-900 dark:text-white">{sellingProduct.name}</span></p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Available Stock: <span className={`font-semibold ${sellingProduct.stock < 5 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{sellingProduct.stock}</span></p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Price: <span className="font-semibold text-green-600 dark:text-green-400">${sellingProduct.priceSell}</span></p>
              </div>

              {formError && (
                 <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-md flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
                 </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity Sold</label>
                <input type="number" min="1" max={sellingProduct.stock} required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  value={sellQuantity} onChange={e => setSellQuantity(e.target.value)} />
              </div>

              {/* Sale Summary Preview */}
              {!isNaN(parseInt(sellQuantity)) && parseInt(sellQuantity) > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-md text-sm space-y-1">
                      <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Total:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">${(sellingProduct.priceSell * parseInt(sellQuantity)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Estimated Profit:</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">${((sellingProduct.priceSell - sellingProduct.priceBuy) * parseInt(sellQuantity)).toFixed(2)}</span>
                      </div>
                  </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsSellModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={sellingProduct.stock <= 0} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  Confirm Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;