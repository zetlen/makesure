/**
 * Utility functions for the application
 * Updated with new features
 */

function calculateSum(a, b) {
  return a + b;
}

function calculateDifference(a, b) {
  return a - b;
}

function calculateProduct(a, b, c = 1) {
  return a * b * c;
}

function formatCurrency(amount, currency = 'USD') {
  const symbols = { EUR: '€', GBP: '£', USD: '$' };
  return `${symbols[currency] || '$'}${amount.toFixed(2)}`;
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

const API_ENDPOINT = 'https://api.example.com/v2';

class UserService {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.timeout = options.timeout || 5000;
  }

  async fetchUser(id) {
    const response = await fetch(`${API_ENDPOINT}/users/${id}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    return response.json();
  }

  async updateUser(id, data) {
    const response = await fetch(`${API_ENDPOINT}/users/${id}`, {
      body: JSON.stringify(data),
      method: 'PUT',
    });
    return response.json();
  }
}

class CacheService {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value);
  }
}

module.exports = {
  CacheService,
  calculateDifference,
  calculateProduct,
  calculateSum,
  formatCurrency,
  UserService,
  validateEmail,
};
