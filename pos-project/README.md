# Point of Sale (POS) System

## Overview
This is a Point of Sale (POS) system designed to manage sales transactions, products, and users efficiently. The application is built using TypeScript and Express.js, providing a robust and scalable solution for retail environments.

## Features
- Manage products: Add, update, and retrieve product information.
- Handle sales transactions: Create and view sales records.
- User management: Register and manage users with different roles.

## Project Structure
```
pos-project
├── src
│   ├── app.ts                # Entry point of the application
│   ├── controllers           # Contains controllers for handling requests
│   │   └── salesController.ts
│   ├── models                # Contains data models
│   │   ├── product.ts
│   │   ├── sale.ts
│   │   └── user.ts
│   ├── routes                # Contains route definitions
│   │   ├── productRoutes.ts
│   │   ├── saleRoutes.ts
│   │   └── userRoutes.ts
│   └── types                 # Contains TypeScript interfaces
│       └── index.ts
├── package.json              # NPM configuration file
├── tsconfig.json             # TypeScript configuration file
└── README.md                 # Project documentation
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd pos-project
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Compile the TypeScript files:
   ```
   npm run build
   ```
5. Start the application:
   ```
   npm start
   ```

## Usage
- Access the API endpoints for managing products, sales, and users.
- Use tools like Postman or cURL to interact with the API.

## API Endpoints

### Products
- `GET /products`  
  List all products.

- `GET /products/:id`  
  Get a product by ID.

- `POST /products`  
  Add a new product.  
  **Body:**  
  ```json
  {
    "name": "Apple",
    "price": 2,
    "stock": 100
  }
  ```

- `PUT /products/:id`  
  Update a product.  
  **Body:**  
  ```json
  {
    "name": "Banana",
    "price": 3,
    "stock": 50
  }
  ```

- `DELETE /products/:id`  
  Delete a product.

---

### Sales
- `GET /sales`  
  List all sales.

- `POST /sales`  
  Create a new sale.  
  **Body:**  
  ```json
  {
    "items": [
      { "productId": 1, "quantity": 2 }
    ]
  }
  ```

- `GET /sales/summary`  
  Get total sales and count.

---

### Users
- `GET /users`  
  List all users.

- `POST /users`  
  Add a new user.  
  **Body:**  
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "role": "cashier"
  }
  ```

- `PUT /users/:id`  
  Update a user.  
  **Body:**  
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "admin"
  }
  ```

- `DELETE /users/:id`  
  Delete a user.

---

**Tip:**  
Use [Postman](https://www.postman.com/) or `curl` to interact with these endpoints.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.