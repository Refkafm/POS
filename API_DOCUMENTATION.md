# POS System API Documentation

This document provides comprehensive documentation for the POS System REST API, including authentication, endpoints, request/response formats, and usage examples.

# lalalalala
## 📋 Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Users](#users)
  - [Products](#products)
  - [Categories](#categories)
  - [Sales](#sales)
  - [Customers](#customers)
  - [Suppliers](#suppliers)
  - [Purchase Orders](#purchase-orders)
  - [Inventory](#inventory)
  - [Reports](#reports)
  - [System](#system)

## Base URL

```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

## Authentication

The API uses JWT (JSON Web Token) based authentication with refresh tokens.

### Authentication Flow

1. **Login** with username/password to get access and refresh tokens
2. **Include access token** in Authorization header for protected endpoints
3. **Refresh tokens** when access token expires
4. **Logout** to invalidate tokens

### Token Format

```http
Authorization: Bearer <access_token>
```

### Token Expiration

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456789"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

## Rate Limiting

- **General endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **Report endpoints**: 20 requests per minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## API Endpoints

### Authentication Endpoints

#### POST /auth/login

Authenticate user and receive tokens.

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "permissions": ["read", "write", "delete"]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  }
}
```

#### POST /auth/refresh

Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

#### POST /auth/logout

Logout and invalidate tokens.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /auth/me

Get current user information.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "permissions": ["read", "write", "delete"],
    "lastLogin": "2024-01-15T10:30:00.000Z"
  }
}
```

### Users

#### GET /users

Get list of users with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `role` (string): Filter by role
- `search` (string): Search by username or email
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): Sort order (asc/desc, default: desc)

**Example:**
```http
GET /api/users?page=1&limit=10&role=cashier&search=john
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_123",
        "username": "john_doe",
        "email": "john@example.com",
        "role": "cashier",
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "lastLogin": "2024-01-15T09:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 45,
      "itemsPerPage": 10
    }
  }
}
```

#### POST /users

Create a new user.

**Request:**
```json
{
  "username": "new_user",
  "email": "newuser@example.com",
  "password": "securePassword123",
  "role": "cashier",
  "permissions": ["read", "write"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_456",
    "username": "new_user",
    "email": "newuser@example.com",
    "role": "cashier",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /users/:id

Get user by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "cashier",
    "permissions": ["read", "write"],
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### PUT /users/:id

Update user information.

**Request:**
```json
{
  "email": "updated@example.com",
  "role": "manager",
  "isActive": true
}
```

#### DELETE /users/:id

Delete user (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### Products

#### GET /products

Get list of products with filtering and search.

**Query Parameters:**
- `page`, `limit`, `sortBy`, `sortOrder` (pagination)
- `category` (string): Filter by category ID
- `search` (string): Search by name, SKU, or barcode
- `inStock` (boolean): Filter by stock availability
- `minPrice`, `maxPrice` (number): Price range filter

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod_123",
        "name": "Coffee Beans",
        "description": "Premium coffee beans",
        "sku": "CB001",
        "barcode": "1234567890123",
        "price": 15.99,
        "cost": 8.50,
        "category": {
          "id": "cat_123",
          "name": "Beverages"
        },
        "stock": {
          "quantity": 50,
          "minQuantity": 10,
          "maxQuantity": 100
        },
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 95,
      "itemsPerPage": 10
    }
  }
}
```

#### POST /products

Create a new product.

**Request:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "sku": "NP001",
  "barcode": "1234567890124",
  "price": 25.99,
  "cost": 15.00,
  "categoryId": "cat_123",
  "stock": {
    "quantity": 100,
    "minQuantity": 20,
    "maxQuantity": 200
  },
  "supplier": {
    "id": "sup_123",
    "cost": 15.00
  }
}
```

#### GET /products/:id

Get product by ID with full details.

#### PUT /products/:id

Update product information.

#### DELETE /products/:id

Delete product (soft delete).

#### POST /products/:id/stock

Update product stock quantity.

**Request:**
```json
{
  "quantity": 50,
  "type": "adjustment", // "sale", "purchase", "adjustment", "return"
  "reason": "Stock count correction",
  "reference": "ADJ001"
}
```

### Categories

#### GET /categories

Get list of product categories.

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat_123",
        "name": "Beverages",
        "description": "Hot and cold beverages",
        "parentId": null,
        "isActive": true,
        "productCount": 25,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

#### POST /categories

Create a new category.

#### GET /categories/:id

Get category by ID.

#### PUT /categories/:id

Update category.

#### DELETE /categories/:id

Delete category.

### Sales

#### GET /sales

Get list of sales transactions.

**Query Parameters:**
- `page`, `limit`, `sortBy`, `sortOrder` (pagination)
- `startDate`, `endDate` (string): Date range filter (ISO format)
- `cashier` (string): Filter by cashier ID
- `customer` (string): Filter by customer ID
- `paymentMethod` (string): Filter by payment method
- `status` (string): Filter by status

**Response:**
```json
{
  "success": true,
  "data": {
    "sales": [
      {
        "id": "sale_123",
        "receiptNumber": "RCP001234",
        "items": [
          {
            "productId": "prod_123",
            "name": "Coffee Beans",
            "quantity": 2,
            "price": 15.99,
            "total": 31.98
          }
        ],
        "subtotal": 31.98,
        "tax": 2.56,
        "discount": 0,
        "total": 34.54,
        "paymentMethod": "cash",
        "cashier": {
          "id": "user_123",
          "username": "john_doe"
        },
        "customer": {
          "id": "cust_123",
          "name": "Jane Smith"
        },
        "status": "completed",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 20,
      "totalItems": 195,
      "itemsPerPage": 10
    },
    "summary": {
      "totalSales": 195,
      "totalRevenue": 5432.10,
      "averageTransaction": 27.86
    }
  }
}
```

#### POST /sales

Create a new sale transaction.

**Request:**
```json
{
  "items": [
    {
      "productId": "prod_123",
      "quantity": 2,
      "price": 15.99
    }
  ],
  "customerId": "cust_123",
  "paymentMethod": "cash",
  "paymentDetails": {
    "amountPaid": 40.00,
    "change": 5.46
  },
  "discount": {
    "type": "percentage",
    "value": 10,
    "reason": "Customer loyalty"
  },
  "notes": "Customer requested extra receipt"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sale_456",
    "receiptNumber": "RCP001235",
    "total": 34.54,
    "status": "completed",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /sales/:id

Get sale transaction by ID.

#### PUT /sales/:id

Update sale transaction (limited fields).

#### POST /sales/:id/refund

Process refund for a sale.

**Request:**
```json
{
  "items": [
    {
      "productId": "prod_123",
      "quantity": 1,
      "reason": "Defective product"
    }
  ],
  "refundMethod": "cash",
  "reason": "Customer complaint"
}
```

### Customers

#### GET /customers

Get list of customers.

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "cust_123",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+1234567890",
        "address": {
          "street": "123 Main St",
          "city": "Anytown",
          "state": "ST",
          "zipCode": "12345",
          "country": "USA"
        },
        "loyaltyPoints": 150,
        "totalPurchases": 1250.75,
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

#### POST /customers

Create a new customer.

#### GET /customers/:id

Get customer by ID.

#### PUT /customers/:id

Update customer information.

#### DELETE /customers/:id

Delete customer.

#### GET /customers/:id/purchases

Get customer purchase history.

### Suppliers

#### GET /suppliers

Get list of suppliers.

#### POST /suppliers

Create a new supplier.

#### GET /suppliers/:id

Get supplier by ID.

#### PUT /suppliers/:id

Update supplier information.

#### DELETE /suppliers/:id

Delete supplier.

### Purchase Orders

#### GET /purchase-orders

Get list of purchase orders.

**Response:**
```json
{
  "success": true,
  "data": {
    "purchaseOrders": [
      {
        "id": "po_123",
        "orderNumber": "PO001234",
        "supplier": {
          "id": "sup_123",
          "name": "ABC Supplies"
        },
        "items": [
          {
            "productId": "prod_123",
            "name": "Coffee Beans",
            "quantity": 100,
            "unitCost": 8.50,
            "total": 850.00
          }
        ],
        "subtotal": 850.00,
        "tax": 68.00,
        "total": 918.00,
        "status": "pending",
        "orderDate": "2024-01-15T10:30:00.000Z",
        "expectedDate": "2024-01-20T10:30:00.000Z"
      }
    ]
  }
}
```

#### POST /purchase-orders

Create a new purchase order.

#### GET /purchase-orders/:id

Get purchase order by ID.

#### PUT /purchase-orders/:id

Update purchase order.

#### POST /purchase-orders/:id/receive

Receive items from purchase order.

**Request:**
```json
{
  "items": [
    {
      "productId": "prod_123",
      "quantityReceived": 95,
      "condition": "good",
      "notes": "5 items damaged in shipping"
    }
  ],
  "receivedDate": "2024-01-18T10:30:00.000Z",
  "receivedBy": "user_123"
}
```

### Inventory

#### GET /inventory

Get inventory overview.

**Response:**
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "productId": "prod_123",
        "name": "Coffee Beans",
        "sku": "CB001",
        "currentStock": 45,
        "minQuantity": 10,
        "maxQuantity": 100,
        "status": "in_stock", // "in_stock", "low_stock", "out_of_stock"
        "value": 382.50,
        "lastMovement": "2024-01-15T10:30:00.000Z"
      }
    ],
    "summary": {
      "totalProducts": 150,
      "totalValue": 25430.75,
      "lowStockItems": 8,
      "outOfStockItems": 2
    }
  }
}
```

#### GET /inventory/movements

Get inventory movement history.

**Response:**
```json
{
  "success": true,
  "data": {
    "movements": [
      {
        "id": "mov_123",
        "productId": "prod_123",
        "type": "sale", // "sale", "purchase", "adjustment", "return"
        "quantity": -2,
        "previousStock": 47,
        "newStock": 45,
        "reference": "sale_456",
        "reason": "Product sold",
        "createdBy": "user_123",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

#### POST /inventory/adjustment

Create inventory adjustment.

**Request:**
```json
{
  "productId": "prod_123",
  "quantity": 5,
  "type": "increase", // "increase", "decrease"
  "reason": "Stock count correction",
  "notes": "Found additional items in storage"
}
```

### Reports

#### GET /reports/sales

Get sales report.

**Query Parameters:**
- `startDate`, `endDate` (string): Date range
- `groupBy` (string): Group by period (day, week, month, year)
- `cashier` (string): Filter by cashier
- `category` (string): Filter by product category

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSales": 150,
      "totalRevenue": 4250.75,
      "averageTransaction": 28.34,
      "topSellingProduct": {
        "id": "prod_123",
        "name": "Coffee Beans",
        "quantitySold": 45
      }
    },
    "dailyBreakdown": [
      {
        "date": "2024-01-15",
        "sales": 25,
        "revenue": 712.50
      }
    ],
    "paymentMethods": [
      {
        "method": "cash",
        "count": 85,
        "amount": 2400.25
      },
      {
        "method": "card",
        "count": 65,
        "amount": 1850.50
      }
    ]
  }
}
```

#### GET /reports/inventory

Get inventory report.

#### GET /reports/financial

Get financial report.

#### GET /reports/customers

Get customer analytics report.

### System

#### GET /health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": "connected",
      "redis": "connected",
      "storage": "available"
    }
  }
}
```

#### GET /metrics

Prometheus metrics endpoint (for monitoring).

#### GET /system/info

Get system information (admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "environment": "production",
    "nodeVersion": "18.17.0",
    "memory": {
      "used": 125.5,
      "total": 512.0,
      "unit": "MB"
    },
    "database": {
      "status": "connected",
      "collections": 8,
      "totalDocuments": 15420
    }
  }
}
```

## 📝 Usage Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

class POSApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async login(username, password) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        username,
        password
      });
      
      this.accessToken = response.data.data.tokens.accessToken;
      this.refreshToken = response.data.data.tokens.refreshToken;
      
      return response.data.data.user;
    } catch (error) {
      throw new Error(error.response.data.error.message);
    }
  }

  async getProducts(params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/products`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        params
      });
      
      return response.data.data;
    } catch (error) {
      if (error.response.status === 401) {
        await this.refreshAccessToken();
        return this.getProducts(params);
      }
      throw new Error(error.response.data.error.message);
    }
  }

  async createSale(saleData) {
    try {
      const response = await axios.post(`${this.baseURL}/sales`, saleData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.data;
    } catch (error) {
      throw new Error(error.response.data.error.message);
    }
  }

  async refreshAccessToken() {
    try {
      const response = await axios.post(`${this.baseURL}/auth/refresh`, {
        refreshToken: this.refreshToken
      });
      
      this.accessToken = response.data.data.accessToken;
    } catch (error) {
      // Refresh token expired, need to login again
      this.accessToken = null;
      this.refreshToken = null;
      throw new Error('Session expired, please login again');
    }
  }
}

// Usage
const client = new POSApiClient('http://localhost:3001/api');

async function example() {
  try {
    // Login
    const user = await client.login('admin', 'password123');
    console.log('Logged in as:', user.username);
    
    // Get products
    const products = await client.getProducts({ page: 1, limit: 10 });
    console.log('Products:', products.products.length);
    
    // Create sale
    const sale = await client.createSale({
      items: [
        {
          productId: 'prod_123',
          quantity: 2,
          price: 15.99
        }
      ],
      paymentMethod: 'cash'
    });
    console.log('Sale created:', sale.receiptNumber);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Python

```python
import requests
import json

class POSApiClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
        self.session = requests.Session()
    
    def login(self, username, password):
        response = self.session.post(
            f"{self.base_url}/auth/login",
            json={"username": username, "password": password}
        )
        
        if response.status_code == 200:
            data = response.json()["data"]
            self.access_token = data["tokens"]["accessToken"]
            self.refresh_token = data["tokens"]["refreshToken"]
            return data["user"]
        else:
            raise Exception(response.json()["error"]["message"])
    
    def _get_headers(self):
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def get_products(self, **params):
        response = self.session.get(
            f"{self.base_url}/products",
            headers=self._get_headers(),
            params=params
        )
        
        if response.status_code == 200:
            return response.json()["data"]
        elif response.status_code == 401:
            self.refresh_access_token()
            return self.get_products(**params)
        else:
            raise Exception(response.json()["error"]["message"])
    
    def create_sale(self, sale_data):
        response = self.session.post(
            f"{self.base_url}/sales",
            headers=self._get_headers(),
            json=sale_data
        )
        
        if response.status_code == 201:
            return response.json()["data"]
        else:
            raise Exception(response.json()["error"]["message"])

# Usage
client = POSApiClient("http://localhost:3001/api")

try:
    # Login
    user = client.login("admin", "password123")
    print(f"Logged in as: {user['username']}")
    
    # Get products
    products = client.get_products(page=1, limit=10)
    print(f"Products: {len(products['products'])}")
    
    # Create sale
    sale = client.create_sale({
        "items": [
            {
                "productId": "prod_123",
                "quantity": 2,
                "price": 15.99
            }
        ],
        "paymentMethod": "cash"
    })
    print(f"Sale created: {sale['receiptNumber']}")
    
except Exception as e:
    print(f"Error: {e}")
```

## 🔒 Security Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (not in localStorage for web apps)
3. **Implement proper token refresh** logic
4. **Validate all input** on the client side
5. **Handle errors gracefully**
6. **Implement rate limiting** on the client side
7. **Log API calls** for debugging and monitoring
8. **Use environment variables** for API endpoints and keys

## 📞 Support

For API support and questions:

- **Documentation**: This document
- **Issues**: Create an issue in the project repository
- **Email**: api-support@yourcompany.com
- **Slack**: #pos-api-support

---

**Note**: This API documentation is version 1.0. Check the `/system/info` endpoint for the current API version in your deployment.