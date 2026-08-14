import React, { useState, useRef, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { Product } from '../types';
import { Camera, Search, X, Zap, Package, ShoppingCart, Info, ScanLine, Tag } from 'lucide-react';
import { Modal } from './ui/modal';
import toast from 'react-hot-toast';

type ScanMode = 'ADD_TO_CART' | 'PRICE_CHECK';

export default function BarcodeScanner() {
  const { products, addToCart } = usePosStore();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const [scanMode, setScanMode] = useState<ScanMode>('ADD_TO_CART');

  // For Price Check Modal
  const [checkedProduct, setCheckedProduct] = useState<Product | null>(null);
  const [showCheckModal, setShowCheckModal] = useState(false);

  // Visual Feedback
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load scan history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('whiz-pos-scan-history');
    if (savedHistory) {
      try {
        setScanHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to load scan history:', error);
      }
    }
  }, []);

  // Save scan history to localStorage
  useEffect(() => {
    if (scanHistory.length > 0) {
      localStorage.setItem('whiz-pos-scan-history', JSON.stringify(scanHistory.slice(-20))); // Keep last 20 scans
    }
  }, [scanHistory]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
        setCameraError('');
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError('Unable to access camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const processScan = (code: string) => {
    setScannedCode(code);
    addToScanHistory(code);

    const product = products.find(p => 
      p.id === code ||
      (p.productId && p.productId === code) ||
      (p.name || '').toLowerCase().includes(code.toLowerCase()) // Fallback for simulation
    );

    if (product) {
        handleProductFound(product);
    } else {
        // Not found feedback
        toast.error(`Product with code ${code} not found.`);
    }
  };

  const handleProductFound = (product: Product) => {
      if (scanMode === 'ADD_TO_CART') {
          addToCart(product);
          setLastScannedProduct(product);
          setFlashSuccess(true);
          setTimeout(() => setFlashSuccess(false), 1000);
          setTimeout(() => setLastScannedProduct(null), 3000);
      } else {
          setCheckedProduct(product);
          setShowCheckModal(true);
      }
  };

  const simulateBarcodeScan = () => {
    // Simulate barcode scanning with random product codes or just pick a random product
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    if (randomProduct) {
        processScan(randomProduct.id);
    } else {
        // Fallback if no products
        const mockCode = '123456789';
        processScan(mockCode);
    }
  };

  const handleManualSearch = () => {
    // Exact match first
    const exactMatch = products.find(p => p.id === searchTerm || p.productId === searchTerm);
    if (exactMatch) {
        handleProductFound(exactMatch);
        setSearchTerm('');
        return;
    }

    // Fuzzy search handled by UI list filtering, but if they hit Enter:
    // We could show the first result?
    // For now, manual search usually implies looking at the list.
    // Let's rely on the list below the search bar.
  };

  const addToScanHistory = (code: string) => {
    setScanHistory(prev => [...prev.slice(-19), code]); // Keep last 20 scans
  };

  const clearHistory = () => {
    setScanHistory([]);
    localStorage.removeItem('whiz-pos-scan-history');
  };

  const filteredProducts = products.filter(product =>
    (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(product.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <ScanLine className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Scanner</h1>
                <p className="text-gray-600">Barcode scanner & price checker</p>
              </div>
            </div>

            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                    onClick={() => setScanMode('ADD_TO_CART')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all font-medium text-sm ${
                        scanMode === 'ADD_TO_CART'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Scan to Cart</span>
                </button>
                <button
                    onClick={() => setScanMode('PRICE_CHECK')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all font-medium text-sm ${
                        scanMode === 'PRICE_CHECK'
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Tag className="w-4 h-4" />
                    <span>Price Check</span>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Scanner Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Camera View */}
            <div className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${flashSuccess ? 'ring-4 ring-green-400' : ''}`}>
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                 <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-gray-500" />
                    Camera Feed
                 </h2>
                 <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${isScanning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isScanning ? 'Active' : 'Inactive'}
                 </span>
              </div>

              <div className="relative bg-black min-h-[400px] flex items-center justify-center">
                 {!isScanning ? (
                    <div className="text-center p-8">
                        <ScanLine className="w-20 h-20 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                            Camera is currently inactive. Click start to begin scanning barcodes.
                        </p>
                        <button
                            onClick={startCamera}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium transition-transform hover:scale-105 flex items-center gap-2 mx-auto"
                        >
                            <Camera className="w-5 h-5" />
                            Start Scanning
                        </button>
                        {cameraError && (
                             <p className="text-red-400 mt-4 text-sm bg-red-900/20 py-2 px-4 rounded">{cameraError}</p>
                        )}
                    </div>
                 ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover absolute inset-0"
                        />
                        {/* Overlay Guide */}
                        <div className="absolute inset-0 border-2 border-black/50 z-10 pointer-events-none flex flex-col items-center justify-center">
                             <div className="w-3/4 h-48 border-2 border-white/50 rounded-lg relative overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                <div className="absolute top-0 left-0 w-full h-1 bg-red-500/80 animate-[scan_2s_ease-in-out_infinite]"></div>
                             </div>
                             <p className="text-white/80 mt-4 font-medium text-shadow">Position barcode in frame</p>
                        </div>

                        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-4">
                             <button
                                onClick={simulateBarcodeScan}
                                className="bg-white/20 hover:bg-white/30 backdrop-blur text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                             >
                                Simulate Scan
                             </button>
                             <button
                                onClick={stopCamera}
                                className="bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur transition-colors"
                             >
                                Stop
                             </button>
                        </div>
                    </>
                 )}
              </div>
            </div>

            {/* Last Scanned Feedback (In ADD_TO_CART mode) */}
            {lastScannedProduct && scanMode === 'ADD_TO_CART' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-green-100 p-2 rounded-lg">
                        <ShoppingCart className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-green-800">Added to Cart!</p>
                        <p className="text-green-700">{lastScannedProduct.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-green-800">KES {lastScannedProduct.price.toLocaleString()}</p>
                    </div>
                </div>
            )}

          </div>

          {/* Sidebar: Manual Entry & History */}
          <div className="space-y-6">

             {/* Manual Entry */}
             <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-gray-500" />
                    Manual Entry
                </h3>
                <div className="space-y-3">
                    <div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Enter Name or Code..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {searchTerm && (
                        <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.slice(0, 5).map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleProductFound(p)}
                                        className="w-full text-left p-3 hover:bg-blue-50 transition-colors flex items-center gap-3"
                                    >
                                        <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                                            <img src={p.image} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                                            <p className="text-xs text-gray-500">KES {p.price}</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <p className="text-center py-4 text-gray-400 text-sm">No match found</p>
                            )}
                        </div>
                    )}
                </div>
             </div>

             {/* History */}
             <div className="bg-white rounded-xl shadow-sm p-6">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-semibold text-gray-800">Scan History</h3>
                     <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700">Clear</button>
                 </div>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                     {scanHistory.length > 0 ? (
                         scanHistory.slice().reverse().map((code, idx) => (
                             <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm group">
                                 <span className="font-mono text-gray-600">{code}</span>
                                 <span className="text-xs text-gray-400">{new Date().toLocaleTimeString()}</span>
                             </div>
                         ))
                     ) : (
                         <div className="text-center py-8 text-gray-400">
                             <ScanLine className="w-8 h-8 mx-auto mb-2 opacity-20" />
                             <p className="text-xs">No recent scans</p>
                         </div>
                     )}
                 </div>
             </div>
          </div>
        </div>

        {/* Price Check Modal */}
        {showCheckModal && checkedProduct && (
            <Modal isOpen={showCheckModal} onClose={() => setShowCheckModal(false)} title="Price Check Result">
                <div className="text-center p-6">
                    <div className="w-32 h-32 bg-gray-100 rounded-xl mx-auto mb-6 overflow-hidden shadow-sm">
                        <img src={checkedProduct.image} alt={checkedProduct.name} className="w-full h-full object-cover" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{checkedProduct.name}</h2>
                    <div className="text-4xl font-black text-blue-600 mb-6">
                        KES {checkedProduct.price.toLocaleString()}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8 text-left bg-gray-50 p-4 rounded-lg">
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider block">Stock Level</span>
                            <span className="font-medium text-gray-900">{checkedProduct.stock ?? 'N/A'} units</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider block">Category</span>
                            <span className="font-medium text-gray-900">{checkedProduct.category || 'General'}</span>
                        </div>
                         <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider block">Code</span>
                            <span className="font-medium text-gray-900 font-mono">{checkedProduct.productId || checkedProduct.id}</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowCheckModal(false)}
                            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => {
                                addToCart(checkedProduct);
                                setShowCheckModal(false);
                                setFlashSuccess(true);
                                setTimeout(() => setFlashSuccess(false), 1000);
                            }}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Add to Cart
                        </button>
                    </div>
                </div>
            </Modal>
        )}
      </div>
    </div>
  );
}
