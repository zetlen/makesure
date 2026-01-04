/**
 * Utility functions for the application
 */

function calculateSum(a, b) {
  return a + b;
}

function calculateProduct(a, b) {
  return a * b;
}

function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

const API_ENDPOINT = 'https://api.example.com/v1';

class UserService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async fetchUser(id) {
    const response = await fetch(`${API_ENDPOINT}/users/${id}`);
    return response.json();
  }
}

module.exports = {
  calculateProduct,
  calculateSum,
  formatCurrency,
  UserService,
};
