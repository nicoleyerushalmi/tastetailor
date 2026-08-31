# Product Specification Document — TasteTailor

## 1. Executive Summary

TasteTailor is an advanced, AI-powered web platform for personalized recipe management. The application allows users to either input an existing recipe or request a dish from scratch, instantly generating a version that matches their personal dietary preferences, lifestyle goals, or a specific culinary style.

Furthermore, the app dynamically scales ingredients based on the number of diners and generates smart, exportable shopping lists that merge identical ingredients across recipes (same name and unit) so nothing gets copied twice. To ensure users never lose a great meal, the app maintains a private, ChatGPT-style **Personal Recipe History** of all their tailored recipes, allowing them to bookmark specific generations into a dedicated **Favorites** library.

---

## 2. The Problem

Today, despite the abundance of culinary content online, users face significant pain points when trying to cook:

- **Information Overload & Blank Page Syndrome:** Finding a specific recipe requires jumping between blogs and scrolling past endless text. Conversely, when users just want a specific dish (e.g., "Vegan Lasagna"), they often don't know where to start looking.
- **Lack of Personalization:** A user might find a viral recipe but cannot cook it due to dietary restrictions (vegan, celiac) or fitness goals (low-carb, high-protein).
- **Fear of Unpredictable Substitutions:** When home cooks substitute an ingredient (e.g., coconut oil instead of butter), they often don't understand how it will affect the texture, taste, or baking time.
- **Scaling Errors:** Manually calculating ingredient ratios when converting a recipe from 4 servings to 7 often leads to culinary mistakes.
- **Shopping List Inefficiencies:** Manually copying ingredients from a recipe to a shopping list is tedious, and duplicate entries pile up across recipes with no seamless way to export the list to third-party price-comparison bots.
- **Losing Recipes:** Users often lose track of recipes they loved because they are scattered across different browser bookmarks, screenshots, or forgotten in past web searches.

---

## 3. Target Audience

- **Individuals with Dietary Restrictions:** Vegans, vegetarians, people with lactose/gluten intolerances, and diabetics.
- **Fitness Enthusiasts & Health-Conscious Eaters:** Users tracking macros who want to convert standard recipes into high-protein or low-calorie versions.
- **Culinary Enthusiasts ("Foodies"):** Home cooks who love experimenting and want to give standard recipes a unique "twist" (e.g., in the style of a specific chef).
- **Household Managers:** People who cook for varying numbers of people and need efficient tools for meal planning and smart grocery shopping.

---

## 4. The Client

The primary business model for the MVP (Minimum Viable Product) is strictly **B2C** (Business to Consumer). The client is the end-user who registers to manage their daily cooking and dietary needs.

> **Future Roadmap:** The platform can expand to a B2B2C model, allowing dietitians and personal trainers to use the tool to tailor recipes for their clients.

---

## 5. Business Goals

- **User Retention & Engagement:** Creating a seamless, highly personalized experience that turns the app into a daily/weekly habit for meal planning.
- **Cost & Time Efficiency for the User:** Providing exportable shopping lists that enable smart consumerism and easy price comparisons.
- **Future Monetization (Post-MVP Roadmap):**
  - **Freemium Model:** Basic conversions are free, while premium features require a subscription.
  - **Affiliate Marketing:** Integrating the shopping list directly with online supermarket delivery services.

---

## 6. Required Software Capabilities

To achieve these goals, the MVP requires the following technical capabilities:

1. **Authentication & Profile Management:** Secure login and a dedicated database table to store permanent user dietary preferences.
2. **Structured AI Integration (LLM):** The ability to process dual inputs (either a pasted recipe as free text or a dish name), apply custom prompt engineering based on preferences, and return a validated JSON recipe — the AI itself parses a pasted recipe into structured ingredients/steps rather than requiring the user to fill separate fields.
3. **LLM Guardrails & Cost Control:** Strict system prompts and validation to prevent prompt injection (ensuring the user cannot use the LLM for non-culinary tasks). Implementation of rate limiting per user to control API costs.
4. **"Explainable AI" Engine:** The AI must generate an **Insights Box** explaining the culinary and nutritional logic behind every ingredient substitution or core culinary decision.
5. **Dynamic Frontend State Management:** Real-time mathematical calculation of ingredient quantities without refreshing the page.
6. **Private History Database:** A robust database structure that automatically saves every AI-generated recipe to the user's private account (similar to a chat history), ensuring data is never lost.
7. **Smart Data Export System:** Formatting shopping list data into structured text, merging identical ingredients (same name and unit) across recipes into one line. Different units for the same ingredient are kept as separate lines in the MVP — automatic unit conversion (e.g., cups ↔ grams) is a planned enhancement for a future, more advanced version, not part of this release.

---

## 7. Core User Flows

### Flow 1: Onboarding & Profile Setup

- The user registers securely.
- The user is directed to an initial setup screen to define their baseline profile: allergies, dietary goals (e.g., "Keto"), and general preferences.
- This data is saved and acts as the default filter for all future interactions.

### Flow 2: Tailored Generation, Creator Styling & Personal History

**Dual Input Phase:** From the dashboard, the user chooses between two starting points:

1. **Adapt Existing Recipe:** The user pastes a recipe they found elsewhere as one block of free text — title, ingredients, and steps together — and the AI parses it into a structured recipe.
2. **Generate from Scratch (Free Search):** The user simply inputs the name of a desired dish (e.g., "Mac and Cheese").

**Personalizing "Twist":** Users define the transformation by applying their default dietary profile (e.g., "Vegan-friendly") or selecting a specific culinary influencer to emulate.

- **Bespoke Search:** A free-text field enables users to input the name of any creator or culinary style they prefer, with autocomplete suggestions from a curated list of known creators plus quick-fill style shortcuts (e.g. "Gourmet / fine dining," "Plant-based specialist"). Browsable, categorized creator directories (e.g. grouped by "Gourmet Experts," "Macro-Focused Coaches") are a planned future enhancement.

**AI Processing & Fallback Logic:** The platform synthesizes the input (either the pasted recipe or the dish name) with the user's health profile and the chosen creator's persona.

- **Fallback:** If the LLM does not recognize the requested influencer/persona, the system will announce this to the user via a UI notification and gracefully fallback to standardizing the recipe based solely on the dietary profile and general high-quality culinary standards.

**Output & Automatic Archiving:** The resulting recipe adapts ingredients and methods to the requested voice, including an **Insights Box** detailing the rationale behind specific changes. Every tailored recipe is instantly logged in the user's Personal History for seamless future retrieval.

### Flow 3: Dynamic Scaling

- On any recipe page, the default serving size is displayed (e.g., 4 servings).
- The user clicks (+/-) buttons to adjust the servings to 6.
- All ingredient quantities update proportionally and instantly on the client side.

### Flow 4: Personal Favorites Library

- While viewing any recipe from their personal history, the user can click a **Heart** icon.
- This action marks the recipe as a favorite in the database.
- The user can navigate to a dedicated **Favorites** tab to view a clean gallery of their top recipes for quick, repeated access, separate from their general history.

### Flow 5: Smart Shopping List & Export

- Inside a recipe page, the user clicks **Add to Shopping List**.
- The system aggregates the ingredients into the user's active shopping list in the database. It intelligently merges identical items that share the same name and unit (e.g., "2 onion" + "3 onion" from two different recipes becomes one "5 onion" line). Ingredients with different units (e.g., "1 cup flour" vs. "100 g flour") are kept as separate lines in this version — automatic unit conversion is planned for a future, more advanced release.
- In the **My Shopping List** page, the user can check off items they already own.
- The user clicks **Export for Price Comparison**, which generates a clean, readable text format automatically copied to the clipboard, ready to be pasted into external comparison bots or shopping platforms.

---

## 8. Definition of Success (MVP Metrics)

The project will be considered successful upon delivery if it meets the following criteria:

1. **Functional Completion:** All 5 core user flows are implemented, bug-free, and deployed to production (Vercel + Supabase).
2. **AI Accuracy & Guardrails:** The AI consistently returns valid JSON recipes (whether from scratch or adapted), successfully adopts personas (or uses the fallback), explains its substitutions, and strictly rejects non-culinary prompts.
3. **Data Privacy & State:** Users can only view their own history and shopping lists (via Database RLS policies). Dynamic scaling calculates correctly without breaking the UI.
4. **Smart List Merging:** The shopping list successfully demonstrates the ability to identify and merge identical ingredients (same name and unit) across recipes, keeping different units for the same ingredient as separate, clearly labeled lines.
