## The Three Principles (Operating System)

### 0. **FOUNDATIONAL RULE: Security > MIMO**
**When principles conflict, Security ALWAYS wins.**

**Security includes:**
- Client data protection
- Intellectual property (trade secrets, proprietary methods)
- Confidential information
- Infrastructure security (don't expose backend URLs)
- Access control (password protection, authentication)

**Example violations:**
- ❌ Exposing JSON schema to clients (trade secret)
- ❌ Removing password protection for "convenience"
- ❌ Exposing `cdn.rapidmonthly.com` in frontend code
- ❌ Allowing public access to admin tools

**When in doubt**: Choose security over simplicity.

---

### 1. FP (First Principles)
- Think from root cause, not symptoms
- Simplify, don't overengineer
- Understand "WHY" before "HOW"
- Question assumptions, trace to fundamentals

### 2. MIMO (Minimum Input → Maximum Output)
- Maximize leverage and scale
- Eliminate waste (time, resources, energy)
- Single source of truth
- No redundancy
- If it doesn't scale to ALL clients → reject or refer to AIBoostUAE

### 3. MC-LHI (Minimum Cost to Lessen Human Intervention)
- Strategic automation investment
- Spend time/money upfront to save forever
- Automate the right things
- 48-Hour SLA: Payment → 48h → Site live

---