# Requirements Analysis: Agri-Fishery Cooperative Order and Inventory System

1. **Problem:** 
   The cooperative currently manages orders via text messages and logs inventory in a physical notebook. This causes staff to over-promise stock they do not have, and cancelled orders fail to return stock to inventory, leading to inaccurate records and operational chaos.

2. **Target Users:** 
   Cooperative office and warehouse staff handling inventory, orders, and sales dispatch.

3. **Functional Requirements:**
   - Add, edit, and delete agricultural and fishery products (block deletion if linked to existing orders).
   - Flag low-stock items automatically when stock is below 20 kg.
   - Create multi-item orders calculating line-item totals and overall order cost.
   - Prevent orders exceeding current available stock.
   - Track order lifecycle across states: Pending -> Confirmed -> Delivered, or Cancelled.
   - Deduct inventory only upon confirmation; replenish inventory if a confirmed order is cancelled.
   - Search and filter orders by status, buyer, and date; filter products by category.
   - Generate aggregate reports: delivered sales total, orders by status, and best-selling product.

4. **Required Inputs:**
   - Product: Name (text), Category (Crop/Fishery dropdown), Price per kg (number), Stock in kg (number).
   - Order: Buyer Name (text), Contact Number (text), Order Date (date), Selected Product(s) & quantity in kg.
   - Filters: Order status dropdown, date picker, search string, product category filter.

5. **Expected Outputs:**
   - Product table with prominent "LOW STOCK" badges (<20 kg).
   - Order list with interactive status update actions.
   - Detailed modal/view for individual orders showing item breakdowns.
   - Summary statistics cards: Total Sales (Delivered only), Order count per status, Top-selling product by weight.

6. **Proposed Features:**
   - Product Management Module with protective deletion guards.
   - Point-of-Sale / Order Creation form with dynamic line-item rows and stock-limit validation.
   - State-machine status workflow with automated inventory adjustment rules.
   - Cooperative Analytics Dashboard.

7. **Tools and Technologies:**
   - HTML5, CSS3, Vanilla JavaScript (ES6+).
   - Browser `localStorage` for offline persistence without server/database dependencies.
   - AI Tool: Anthropic Claude for structured generation, debugging, refactoring, and documentation.
   - Git & GitHub for granular version control and pull request review.