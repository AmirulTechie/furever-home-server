# Pet Adoption Platform - Server

## Purpose

This is the backend API server for the Pet Adoption Platform. It provides secure REST API endpoints for managing pets, users, and adoption requests. Built with Node.js, Express, and MongoDB, it handles authentication via JWT stored in HTTPOnly cookies and protects all private routes through middleware verification.

## Live API URL

[https://furever-home-server.vercel.app/](https://furever-home-server.vercel.app/)

## Features

- RESTful API for full CRUD operations on pet listings and adoption requests
- JWT-based authentication with tokens stored in HTTPOnly cookies for security
- Protected middleware to verify tokens on all private routes
- MongoDB integration with advanced query support using $regex for search and $in for species filtering
- Adoption control logic: only one request can be approved per pet, and the pet is marked as adopted on approval
- Pet owners cannot submit adoption requests for their own listings
- Environment variables used to secure all MongoDB credentials and JWT secrets
- CORS configured correctly to allow client-side requests without errors

## NPM Packages Used

- express
- mongoose
- dotenv
- cors
- jsonwebtoken
- cookie-parser
- mongodb

## Environment Variables

Create a `.env` file in the root directory with the following keys:

```
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password
ACCESS_TOKEN_SECRET=your_jwt_secret
NODE_ENV=production
```

## API Endpoints

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | /pets | Public |
| GET | /pets/:id | Public |
| POST | /pets | Private |
| PUT | /pets/:id | Private (Owner) |
| DELETE | /pets/:id | Private (Owner) |
| POST | /requests | Private |
| GET | /requests | Private |
| PATCH | /requests/:id | Private (Owner) |
| DELETE | /requests/:id | Private |
| POST | /jwt | Public |
| POST | /logout | Public |