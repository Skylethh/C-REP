Feature Brief: "Fırsatlar" (Opportunities) Page - The AI-Powered Advisory Module
1. Objective
The goal is to build the "Fırsatlar" page, a proactive advisory module for the C-REP application. This feature will analyze the user's project data to identify potential areas for carbon emission reduction and cost savings. It will transform the application from a passive reporting tool into an active consultant, helping users make smarter, more sustainable, and more cost-effective decisions.

2. Guiding Principles & Phased Approach
User-Friendliness: The insights must be presented in a simple, visual, and easily understandable way. The user should not be overwhelmed with raw data, but with clear, actionable advice.

Phased Implementation: We will start with a simple, rule-based engine for the MVP (Minimum Viable Product) and then enhance it with more complex AI (LLMs) in a later version.

3. Phase 1: Rule-Based MVP (Implement This Now)
The core of the MVP will be a local, server-side function that analyzes data and does not require external AI API calls.

Step 3.1: Create the 'Opportunities Engine' Logic
Task: Create a server-side function that acts as a simple, rule-based suggestion engine.

Instructions for Copilot:

Create a new file at src/lib/opportunities.ts.

Create a main function, e.g., analyzeProjectForOpportunities(projectId).

This function will:
a.  Fetch all relevant data for the given projectId from Supabase (all emission_entries).
b.  Run a series of pre-defined rule checks on this data.
c.  Return an array of "opportunity" objects if any of the rules are triggered.

Implement the following initial rules:

High Concentration Rule: Check if any single category (e.g., "Concrete") constitutes more than 60% of the total emissions. If so, generate an opportunity object for material alternatives.

Self-Benchmarking Rule: Compare the total emissions of the last 30 days to the 30 days prior. If there is a significant increase (e.g., >20%), generate an opportunity object flagging this trend.

Material Alternative Rule (Static Tip): If the project uses a significant amount of standard "Nervürlü İnşaat Demiri", generate a static opportunity card explaining the benefits of using recycled steel.

Step 3.2: Design the UI (/dashboard/opportunities/page.tsx)
Task: Create the user interface to display the generated opportunities.

Instructions for Copilot:

The page should have a clear title like "Proje Fırsatları" (Project Opportunities).

The main layout should be a grid of cards, with each card representing a single opportunity.

Create a reusable component: src/components/opportunities/OpportunityCard.tsx.

Each OpportunityCard must have the following structure:

Header: An icon (e.g., a lightbulb 💡 or a leaf 🌿) and a clear, bold Title (e.g., "Beton Emisyonunu Düşürme Fırsatı").

"Tespit" (The Finding): A simple, data-backed sentence explaining what the system found. E.g., "Projenizin toplam emisyonunun %65'i betondan kaynaklanıyor."

"Öneri" (The Suggestion): A clear, actionable piece of advice. E.g., "Tedarikçinizle görüşerek düşük karbonlu beton seçeneklerini (örn: kalsine kil içeren) değerlendirin."

"Potansiyel Etki" (Potential Impact): This is the most important part. Display the estimated savings. This can be a simple estimate in the MVP. E.g., "Tahmini Azaltım: -15 tCO2e". In the future, we can add an estimated financial saving (TL) here as well.

Action Buttons: At the bottom of the card, include buttons like: [Detayları İncele] (to see the related data) and [Gizle] (to dismiss the suggestion).

4. Phase 2: AI (LLM) Enhancements (Future Vision)
This is how we will make the feature truly "intelligent" after the MVP is successful.

Step 4.1: AI-Generated Elaborations
Task: Integrate an LLM (like Groq, which you are familiar with) to enrich the suggestions.

Instructions for Copilot:

When the rule-based engine (from Phase 1) identifies an opportunity, we will make a call to a new Server Action.

This Server Action will take the finding (e.g., "65% of emissions are from concrete") and send it to the Groq AI API.

The Prompt: The prompt will instruct the AI to act as a "sustainability consultant for the Turkish construction industry" and to elaborate on the suggestion in natural language.

Example AI Output: The AI could expand the simple "Consider low-carbon concrete" suggestion into a more detailed paragraph: "Beton, projenizin karbon ayak izinde en büyük paya sahip. Düşük klinker oranına sahip veya kalsine kil gibi alternatif bağlayıcılar içeren yeşil beton seçenekleri, projenizin sürdürülebilirlik hedeflerine ulaşmanıza yardımcı olabilir ve bazı durumlarda maliyet avantajı bile sağlayabilir..."

This AI-generated text would then be displayed in the "Öneri" section of the OpportunityCard.

By following this phased approach, we can launch a valuable, rule-based "Fırsatlar" page quickly and within budget (zero API cost), while having a clear and exciting roadmap to make it truly AI-powered in the future.







