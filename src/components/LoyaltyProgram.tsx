import React, { useState, useEffect } from 'react';
import { usePosStore, LoyaltyCustomer } from '../store/posStore';
import { Gift, Star, Trophy, Users, TrendingUp, Award, Plus, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  description: string;
  category: 'discount' | 'free' | 'upgrade';
  available: boolean;
}

export default function LoyaltyProgram() {
  const { transactions, loyaltyCustomers, addLoyaltyCustomer, updateLoyaltyCustomer } = usePosStore();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  // Initialize rewards
  useEffect(() => {
    const defaultRewards: Reward[] = [
      {
        id: '1',
        name: '10% Off Next Purchase',
        pointsCost: 100,
        description: 'Get 10% discount on your next order',
        category: 'discount',
        available: true
      },
      {
        id: '2',
        name: 'Free Coffee',
        pointsCost: 150,
        description: 'Redeem for a free regular coffee',
        category: 'free',
        available: true
      },
      {
        id: '3',
        name: 'Free Pastry',
        pointsCost: 200,
        description: 'Redeem for a free pastry item',
        category: 'free',
        available: true
      },
      {
        id: '4',
        name: '25% Off Next Purchase',
        pointsCost: 250,
        description: 'Get 25% discount on your next order',
        category: 'discount',
        available: true
      },
      {
        id: '5',
        name: 'VIP Upgrade',
        pointsCost: 500,
        description: 'Upgrade to VIP tier for exclusive benefits',
        category: 'upgrade',
        available: true
      }
    ];
    setRewards(defaultRewards);
  }, []);

  const getTierColor = (tier: LoyaltyCustomer['tier']) => {
    switch (tier) {
      case 'Bronze': return 'text-orange-600 bg-orange-100';
      case 'Silver': return 'text-gray-600 bg-gray-100';
      case 'Gold': return 'text-yellow-600 bg-yellow-100';
      case 'Platinum': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTierIcon = (tier: LoyaltyCustomer['tier']) => {
    switch (tier) {
      case 'Bronze': return <Award className="w-4 h-4" />;
      case 'Silver': return <Star className="w-4 h-4" />;
      case 'Gold': return <Trophy className="w-4 h-4" />;
      case 'Platinum': return <Crown className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newCustomer: LoyaltyCustomer = {
      id: `LC${Date.now()}`,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      points: 0,
      tier: 'Bronze',
      totalSpent: 0,
      visitsCount: 0,
      lastVisit: new Date().toISOString(),
      rewards: []
    };

    addLoyaltyCustomer(newCustomer);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '' });
    setIsAddCustomerOpen(false);
  };

  const handleRedeemReward = (customer: LoyaltyCustomer, reward: Reward) => {
    if (customer.points >= reward.pointsCost) {
      const updatedPoints = customer.points - reward.pointsCost;
      const updatedRewards = [...(customer.rewards || []), reward.name];
      
      updateLoyaltyCustomer(customer.id, {
          points: updatedPoints,
          rewards: updatedRewards
      });
      
      toast.success(`Successfully redeemed: ${reward.name}`);
      setIsRedeemOpen(false);
      setSelectedCustomer(null);
    } else {
      toast.error('Insufficient points for this reward');
    }
  };

  const totalCustomers = loyaltyCustomers.length;
  const activeCustomers = loyaltyCustomers.filter(c => c.visitsCount > 0).length;
  const totalPointsIssued = loyaltyCustomers.reduce((sum, c) => sum + c.points, 0);
  const tierDistribution = loyaltyCustomers.reduce((acc, customer) => {
    acc[customer.tier] = (acc[customer.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Gift className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Loyalty Program</h1>
                <p className="text-gray-600">Customer rewards and engagement</p>
              </div>
            </div>
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Customers</p>
                <p className="text-2xl font-bold text-gray-800">{totalCustomers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Customers</p>
                <p className="text-2xl font-bold text-gray-800">{activeCustomers}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Points Issued</p>
                <p className="text-2xl font-bold text-gray-800">{totalPointsIssued}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Rewards Available</p>
                <p className="text-2xl font-bold text-gray-800">{rewards.length}</p>
              </div>
              <Gift className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Tiers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(tierDistribution).map(([tier, count]) => (
              <div key={tier} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full mb-2 ${getTierColor(tier as LoyaltyCustomer['tier'])}`}>
                  {getTierIcon(tier as LoyaltyCustomer['tier'])}
                  <span className="font-medium">{tier}</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-sm text-gray-600">customers</p>
              </div>
            ))}
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Customer List</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loyaltyCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.phone}</div>
                        {customer.email && (
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getTierColor(customer.tier)}`}>
                        {getTierIcon(customer.tier)}
                        <span>{customer.tier}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="text-sm font-medium text-gray-900">{customer.points}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      KES {customer.totalSpent.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.visitsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(customer.lastVisit).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsRedeemOpen(true);
                        }}
                        className="text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Redeem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {loyaltyCustomers.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No customers in loyalty program</p>
                <p className="text-sm text-gray-400">Add your first customer to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Available Rewards */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Available Rewards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <div key={reward.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{reward.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    reward.category === 'discount' ? 'bg-blue-100 text-blue-800' :
                    reward.category === 'free' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {reward.category}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{reward.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="font-medium text-gray-800">{reward.pointsCost} points</span>
                  </div>
                  {reward.available ? (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Available
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      Unavailable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Customer Modal */}
        {isAddCustomerOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Add Customer to Loyalty Program</h2>
              
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter customer name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    Add Customer
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Redeem Reward Modal */}
        {isRedeemOpen && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  Redeem Rewards - {selectedCustomer.name}
                </h2>
                <button
                  onClick={() => setIsRedeemOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-purple-800 font-medium">Available Points:</span>
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-500 mr-2" />
                    <span className="text-xl font-bold text-purple-800">{selectedCustomer.points}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.map((reward) => (
                  <div key={reward.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-800">{reward.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        reward.category === 'discount' ? 'bg-blue-100 text-blue-800' :
                        reward.category === 'free' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {reward.category}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{reward.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="font-medium text-gray-800">{reward.pointsCost} points</span>
                      </div>
                      <button
                        onClick={() => handleRedeemReward(selectedCustomer, reward)}
                        disabled={!reward.available || selectedCustomer.points < reward.pointsCost}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          !reward.available || selectedCustomer.points < reward.pointsCost
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {selectedCustomer.points < reward.pointsCost ? 'Insufficient Points' : 'Redeem'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
