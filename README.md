# 🐠 MIZUMI Aquatics

### Inspired by Nature. Created for Aquatic Life.

MIZUMI Aquatics is a web-based aquarium retail platform designed to bring freshwater ornamental fish, aquatic plants, aquarium equipment and aquascaping services together in one place.

The project combines a customer-facing e-commerce website with a custom backend and administrative dashboard. It is being developed to support the operations of MIZUMI Aquatics, an aquarium business based in Ranaghat, West Bengal, India.

**Repository:** [github.com/Debapriyo8145/MIZUMI](https://github.com/Debapriyo8145/MIZUMI)

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [Backend Configuration](#-backend-configuration)
- [Database Setup](#-database-setup)
- [Running the Project](#-running-the-project)
- [Admin Dashboard](#-admin-dashboard)
- [API Overview](#-api-overview)
- [Product Categories](#-product-categories)
- [Development Notes](#-development-notes)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [Author](#-author)

---

## 🌿 About the Project

MIZUMI Aquatics is more than a traditional aquarium store website. It is a digital platform developed to manage and showcase an aquarium retail business.

The platform focuses on:

- Freshwater ornamental fish.
- Aquatic plants.
- Aquarium equipment and accessories.
- Aquarium design and custom aquarium building.
- Aquascaping services.
- Aquarium installations for commercial spaces.

The main objective is to create a professional online shopping experience while maintaining complete control over products, inventory, content and website management through a custom administrative system.

The project is developed with a focus on affordability, scalability and maintainability.

---

## ✨ Key Features

### 1. Customer-Facing Website

- Responsive homepage.
- Custom navigation and branding.
- Freshwater collection with fish-family filters.
- Product catalogue.
- Individual product detail pages.
- Product image galleries.
- Related product recommendations.
- Shopping cart functionality.
- Customer account navigation.
- About Us page.
- Contact and service sections.

### 2. Product Management

The website retrieves product information dynamically from the backend.

Product information includes:

- Product name.
- SKU.
- Main category.
- Subcategory.
- Description.
- Price.
- Stock availability.
- Product images.
- Product specifications.
- Product status.

### 3. Administrative Dashboard

The custom admin panel provides management functionality for the website.

Current development includes:

- Product management.
- Product creation and editing.
- Product inventory information.
- Product category management.
- Announcement management.
- Homepage hero-section management.
- Administrative authentication.

### 4. Dynamic Homepage

The homepage is designed to display content dynamically.

Features include:

- Freshwater collection.
- Fish-family filtering.
- Dynamic product cards.
- Product navigation.
- Promotional announcements.
- Homepage hero content management.

### 5. Product Details

Individual product pages provide:

- Product photographs.
- Product information.
- Pricing and availability.
- Quantity selection.
- Add-to-cart functionality.
- Product specifications.
- Related products.

---

## 🛠 Technology Stack

The project uses a traditional frontend with a separate Node.js backend.

| Technology | Purpose |
|---|---|
| HTML5 | Website structure |
| CSS3 | Styling and responsive layouts |
| JavaScript | Frontend functionality |
| Bootstrap 5 | Responsive UI components |
| Font Awesome | Icons |
| Node.js | Backend runtime |
| Express.js | REST API |
| MongoDB Atlas | Cloud database |
| Mongoose | MongoDB object modelling |
| dotenv | Environment configuration |
| CORS | Cross-origin communication |
| Nodemon | Backend development server |
| Git & GitHub | Version control |

---

## 📁 Project Architecture

The project is organised into separate frontend, backend and administrative sections.

```text
MIZUMI/
│
├── index.html
├── shop.html
├── product_view.html
├── cart.html
├── account.html
├── about.html
│
├── css/
│   ├── style.css
│   ├── account-nav.css
│   └── product-view.css
│
├── js/
│   ├── main.js
│   ├── shop.js
│   ├── product-view.js
│   └── account-nav.js
│
├── backend/
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── scripts/
│   ├── img/
│   ├── package.json
│   └── .env
│
├── admin/
│   ├── products.html
│   ├── js/
│   ├── css/
│   └── ...
│
└── README.md
```

*Note: This is a simplified architectural overview. Consult the repository for the complete and current directory structure.*

---

## 🚀 Getting Started

Follow these instructions to set up the project on your local computer.

### Prerequisites

Install the following software before starting:

| Software | Purpose | Download |
|---|---|---|
| Git | Clone the repository | [Git](https://git-scm.com/downloads) |
| Node.js | Run the backend | [Node.js](https://nodejs.org/) |
| Visual Studio Code | Code editor | [VS Code](https://code.visualstudio.com/) |
| MongoDB Atlas | Cloud database | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) |

You will also need a modern web browser such as Google Chrome.

### Step 1: Clone the Repository

Open PowerShell or your terminal.

```powershell
git clone https://github.com/Debapriyo8145/MIZUMI.git
```

Navigate into the project:

```powershell
cd MIZUMI
```

Open the project in Visual Studio Code:

```powershell
code .
```

### Step 2: Install Backend Dependencies

Navigate to the backend directory:

```powershell
cd backend
```

Install the required dependencies:

```powershell
npm install
```

This installs the packages specified in the backend `package.json`.

### Step 3: Configure Environment Variables

The backend uses environment variables to store configuration details.

Create a `.env` file inside the `backend` directory if one is not already present.

```powershell
New-Item -ItemType File -Path .env -Force
```

Add the environment variables required by the backend.

For example, the configuration may include:

```env
PORT=5000

# Add the MongoDB connection variable
# using the exact name expected by the backend.
```

**Important:** Check `config/db.js` and `server.js` for the exact environment variable names used by the application.

Never upload your actual `.env` file, MongoDB credentials or administrative passwords to GitHub.

### Step 4: Configure MongoDB Atlas

1. Create a MongoDB Atlas account.
2. Create a database cluster.
3. Create a database user.
4. Configure the network access/IP allowlist.
5. Obtain your MongoDB connection string.
6. Add the connection string to your backend `.env` file using the expected variable name.

The backend uses Mongoose to establish a connection with MongoDB.

### Step 5: Start the Backend Server

From the `backend` directory, run:

```powershell
npm run dev
```

The development server should start on:

```text
http://localhost:5000
```

The project also provides a health-check endpoint:

```text
http://localhost:5000/api/v1/health
```

Use this endpoint to check the backend and database connection status.

---

## 🌐 Running the Frontend

The frontend is built using HTML, CSS and JavaScript.

It can be served using the Live Server extension in Visual Studio Code.

### Option 1: Using Live Server

1. Open the MIZUMI project in VS Code.
2. Install the Live Server extension.
3. Open `index.html`.
4. Right-click the file.
5. Select **Open with Live Server**.

The website will usually open at:

```text
http://localhost:5500/index.html
```

### Option 2: Using Another Local Web Server

You can use any local static web server that serves the project root directory.

Make sure the frontend API configuration points to your local backend address.

For example:

```text
http://localhost:5000/api/v1
```

---

## 🗄 Database Setup

MIZUMI uses MongoDB Atlas as its database provider.

The application uses Mongoose for database connectivity and data modelling.

The product collection stores information such as:

- Name
- SKU
- Category
- Subcategory
- Price
- Stock
- Description
- Images
- Specifications
- Active status

### Example Product Document

```json
{
  "name": "Neon Tetra",
  "category": "fish",
  "subcategory": "tetra",
  "price": 50,
  "stock": 30
}
```

This is an illustrative product document. The actual accepted fields and validation rules are defined by the backend Product model.

---

## 🔐 Admin Dashboard

MIZUMI includes a custom administrative interface for managing website content and products.

The admin dashboard communicates with the backend through REST API endpoints.

Administrative functionality includes product management, homepage content controls and other website management features.

To access the admin interface, open the appropriate admin HTML page through your local web server.

**Note:** Administrative access requires valid authentication. Do not share administrator credentials or production database access.

---

## 🔌 API Overview

The backend exposes versioned REST API endpoints.

Base URL:

```text
http://localhost:5000/api/v1
```

### Known Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Backend and database health check |
| GET | `/api/v1/products` | Retrieve products |

The products endpoint supports product retrieval and filtering.

Example:

```http
GET /api/v1/products?category=fish
```

Example with a subcategory:

```http
GET /api/v1/products?category=fish&subcategory=tetra
```

Additional routes are defined in the backend route files.

---

## 🐠 Product Categories

The platform is designed around several main product categories.

| Main Category | Examples |
|---|---|
| Fish | Betta, Discus, Angelfish, Arowana, Goldfish, Mollies, Guppy, Tetras, Cichlids, Gourami, Catfish |
| Plants | Aquatic plants |
| Food | Fish food and feeding products |
| Equipment | Filters, pumps, heaters and aquarium accessories |
| Hardscape | Rocks, driftwood and aquascaping materials |

### Freshwater Fish Filters

The homepage freshwater collection includes:

1. All Fish
2. Betta
3. Discus
4. Angelfish
5. Arowana
6. Goldfish
7. Mollies
8. Guppy
9. Tetras
10. Cichlids
11. Gourami
12. Catfish

These are fish-family filters, not separate main product categories.

---

## 💻 Development Notes

### Frontend and Backend

The frontend and backend operate separately during local development.

| Component | Local Address |
|---|---|
| Frontend | `http://localhost:5500` |
| Backend | `http://localhost:5000` |
| API Base | `http://localhost:5000/api/v1` |

### Running Both Servers

Use two separate terminal windows.

**Terminal 1 — Backend**

```powershell
cd MIZUMI\backend
npm run dev
```

**Terminal 2 — Frontend**

Open the project root with Live Server.

### Important Development Practices

- Keep database credentials inside `.env`.
- Do not commit `node_modules`.
- Do not commit production secrets.
- Validate API responses when integrating new features.
- Keep frontend and backend data structures consistent.
- Test product filtering after changing category or subcategory values.
- Preserve existing functionality when modifying individual pages.

---

## 🔮 Future Improvements

The project is under active development. Potential improvements include:

- Complete customer authentication and account management.
- Improved cart and checkout workflow.
- Payment gateway integration.
- Order management.
- Shipping and delivery management.
- Live fish shipping workflow.
- Advanced inventory management.
- Customer order history.
- Improved product search and filtering.
- SEO improvements.
- Website performance optimisation.
- Production deployment and monitoring.

These are development goals, not a claim that every feature is already implemented.

---

## 🤝 Contributing

Contributions, suggestions and bug reports are welcome.

If you want to contribute:

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Test the functionality.
5. Submit a pull request.

Please avoid committing sensitive configuration files or credentials.

---

## 👨‍💻 Author

**Debapriyo Pal Chowdhury**

Creator and developer of MIZUMI Aquatics.

- GitHub: [@Debapriyo8145](https://github.com/Debapriyo8145)
- Project: [MIZUMI Aquatics](https://github.com/Debapriyo8145/MIZUMI)

---

## 📜 License

A license has not yet been specified for this repository.

Until a license is added, do not assume that the source code is available for unrestricted reuse or redistribution.

---

<p align="center">

**MIZUMI AQUATICS**

*Inspired by Nature. Created for Aquatic Life.*

🐠 🌿

</p>
