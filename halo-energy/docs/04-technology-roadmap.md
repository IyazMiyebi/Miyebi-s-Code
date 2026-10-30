# Halo Energy — Technology & Digital Product Roadmap

Principle: **build on real operating data**. Each phase starts only when the previous phase is producing reliable data and paying for itself. Capabilities are described publicly with their phase label until they are in client use.

## Phase 1 — Digital foundation (now)
**Goal:** run the business digitally from day one so every asset and supplier has a clean record.

| Capability | How (buy/configure before build) |
|---|---|
| Corporate website | This repository |
| CRM & digital RFQs | HubSpot / Zoho CRM; website forms post enquiries and RFQs directly |
| Equipment database | Airtable or Postgres-backed register: asset ID, owner, specs, documents, status |
| Supplier onboarding | Partner registration form → CRM pipeline → verification checklist and document expiry alerts |
| Electronic service records | Mobile inspection and CMMS tool (e.g. Fulcrum, SafetyCulture, UpKeep, Fiix) |

**Exit criteria:** every deployed asset registered; 100% of inspections and services recorded digitally; enquiry-to-proposal tracked in CRM.

## Phase 2 — Connected operations
**Goal:** give clients visibility of the equipment Halo manages. This is the first public version of **Halo Connect**.

| Capability | How |
|---|---|
| Partner-enabled telematics | OEM APIs (ISO 15143-3 / AEMP 2.0 where available) plus aftermarket GPS/hour-meter devices on older machines |
| Asset visibility | Map and register view combining telematics and the equipment database |
| Maintenance dashboards | CMMS data surfaced alongside utilisation |
| Utilisation reporting | Working vs available hours, idle time, availability by asset/site/supplier |
| Client reporting | Scheduled branded reports; later a read-only client view |

**Exit criteria:** paying clients receiving regular reports; utilisation baselines established on at least one project; data model stable.

## Phase 3 — Industrial intelligence
**Goal:** move from reporting what happened to acting on it.

- Advanced analytics on cost, productivity and supplier performance.
- Automated alerts: service due, idle thresholds, geofence breaches, expiring documents.
- Equipment optimisation: right-sizing recommendations from utilisation history.
- **Predictive maintenance pilots** with consenting clients and partners on assets with sufficient fault/hour history.
- Integrated project intelligence: equipment data linked to survey and progress data.

**Exit criteria:** documented pilot outcomes against baselines; client willingness to pay for insight separately from equipment.

## Phase 4 — Scalable technology products
**Goal:** technology revenue independent of Halo's equipment contracts.

- Proprietary or licensed industrial software (Halo Connect as a product).
- Multi-client digital platforms for asset owners, contractors and equipment owners.
- Advanced connected-infrastructure services (IoT on fixed assets; digital twins as a longer-term option).

## Portals (future, behind authentication)
| Portal | Users | Phase |
|---|---|---|
| Client portal | Project and procurement teams | 2 (read-only reports) → 3 (interactive) |
| Fleet dashboard | Clients with Halo-managed or self-owned fleets | 2–3 |
| Equipment-owner portal | Partner owners: utilisation, earnings, service history | 3 |

## Governance
- **Data ownership:** client operational data belongs to the client; partners see their own assets only; export on request.
- **Security:** SSO and role-based access, encryption in transit and at rest, audit logs, vendor security review for every platform.
- **Compliance:** Nigeria Data Protection Act 2023 (NDPA) for personal data; client HSE and data policies as contracted.
- **Honesty rule:** no live-looking dashboard is shown publicly unless it shows real, consented data; concepts carry an "Illustrative · sample data" label.
