**Prompt #1** | Tool: Claude Code
**Purpose:** code generation (UI Layout)
1. **Prompt I used:** (Pasted the structured context, objective, requirements, and constraints for the HTML/CSS layout of the Agri-Fishery Cooperative app).
2. **AI's answer:** Claude generated a complete `index.html` file using semantic markup and ARIA roles for accessibility, and a `style.css` file using CSS variables, flexbox, and grid for a responsive layout.
3. **My evaluation:** The code is correct. The UI looks exactly as requested, responsive down to mobile, but currently lacks interactivity because JS was deliberately excluded from this step.
4. **What I changed:** I created the `js/app.js` file and uncommented the script tag in `index.html` to prepare for the next phase.

**Prompt #2** | Tool: Claude Code
**Purpose:** code generation (Core JS - Product Management & Order Creation)
1. **Prompt I used:** (Pasted the structured context and requirements for Tab Navigation, Product CRUD, and Order Creation using localStorage).
2. **AI's answer:** Claude provided `app.js` with functional tab navigation, local storage initialization, product addition/editing, and a working shopping cart logic for creating orders.
3. **My evaluation:** The code works well. I can add products, stock badges calculate correctly, and I can build a cart and submit an order. However, I noticed I cannot delete a product if it was in a test order, but I couldn't see the order because the Order Records tab logic isn't built yet. Also, the active tab resets on reload.
4. **What I changed:** I verified the code in the browser and prepared the next prompt to implement the missing Order Records and Reports logic, as well as fixing the tab memory.

**Prompt #3** | Tool: Claude Code
**Purpose:** code generation (Order Records, Modal, Status Logic, and Reports)
1. **Prompt I used:** (Pasted the context and requirements for Tab Memory, Order Records filtering, Status Change inventory logic, Modal details, and Reports calculations).
2. **AI's answer:** Claude provided a fully updated `app.js` that implements the order records table, dynamic status changes that deduct/restore stock based on the "Confirmed" rule, an accessible modal, and the required report calculations. It also added a `stockDeducted` flag to safely track inventory.
3. **My evaluation:** The code works perfectly. Orders now appear, status changes successfully deduct stock (and restore it on Cancelled), the reports calculate correctly, and the tab memory works. No bugs found.
4. **What I changed:** I reviewed the `stockDeducted` logic Claude added and agreed it was a smart way to prevent double-deductions. Replaced my old `app.js` with this new version.

**Prompt #4** | Tool: Claude Code
**Purpose:** refactoring (UI Icons)
1. **Prompt I used:** (Pasted the context and requirements to replace text emojis in the header and tabs with clean, inline SVG icons without using external libraries).
2. **AI's answer:** Claude provided an updated `<header>` HTML block containing clean, scalable SVG paths using `currentColor`.
3. **My evaluation:** The SVGs successfully replaced the emojis, making the interface look significantly more professional and modern while strictly adhering to the "no external libraries" constraint.
4. **What I changed:** I replaced the existing `<header>` block in `index.html` with the new SVG version.