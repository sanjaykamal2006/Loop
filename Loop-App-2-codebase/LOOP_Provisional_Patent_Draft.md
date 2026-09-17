# FORM 2
## THE PATENTS ACT, 1970
### (39 of 1970)
### &
### THE PATENTS RULES, 2003
## PROVISIONAL SPECIFICATION
*(See section 10 and rule 13)*

---

### 1. TITLE OF THE INVENTION
**A SYSTEM AND METHOD FOR SECURE, VERIFIED EPHEMERAL PEER COORDINATION AND ZERO-LATENCY MULTI-TENANT STATE SYNCHRONIZATION IN DISTRIBUTED MOBILE NETWORKS**

---

### 2. APPLICANT(S)
* **Name**: [Applicant Name / University Name, e.g., VIT-AP University / Individual Student Name]
* **Nationality**: Indian
* **Address**: [Campus / Residential Address], India

---

### 3. INVENTOR(S)
* **Name**: [Inventor 1 Name]
* **Nationality**: Indian
* **Address**: [Address]
*(Additional co-inventors can be appended here)*

---

### 4. PREAMBLE TO THE DESCRIPTION
The following specification describes the invention.

---

### 5. FIELD OF THE INVENTION
The present invention relates generally to distributed computing, real-time mobile coordination systems, and peer-to-peer ad-hoc group communication. More specifically, the present invention relates to a system and method for cryptographically verified ephemeral peer routing, database-enforced safety invariants, client-side pre-ingestion media optimization, and race-free optimistic multi-tenant state synchronization over resource-constrained mobile networks.

---

### 6. BACKGROUND OF THE INVENTION & PRIOR ART LIMITATIONS
With the rapid proliferation of smart mobile devices in academic campuses, corporate parks, and urban transit hubs, individuals frequently require impromptu, localized coordination with peers travelling to identical destinations at specific times (e.g., carpooling, cab-sharing, split-fare logistics). 

Existing coordination platforms (such as traditional ride-hailing aggregators, bulletin boards, and instant messaging group chats) exhibit severe technical deficiencies:

1. **Heavy Computational Overhead & Social Distraction**: Conventional social applications maintain permanent social graphs, tracking algorithms, and continuous background polling that consume significant battery, memory, and network bandwidth.
2. **Vulnerability to Identity Spoofing & Privilege Escalation**: Existing group chat platforms rely on client-asserted identity or untrusted metadata. Attackers can tamper with client payload parameters to alter their verification status, academic credentials, or demographic attributes (such as gender markers), creating severe safety risks in vulnerable groups (e.g., female-only transit groups).
3. **High-Latency Media Ingestion in Ephemeral Environments**: In standard mobile web architectures, raw multi-megabyte camera images (typically 3MB to 12MB) uploaded over cellular data cause significant network saturation, slow rendering, and client-side memory exhaustion.
4. **Race Conditions in Distributed Channel Entry**: Optimistic UI models in mobile applications often suffer from distributed synchronization race conditions where client-side view routing outpaces asynchronous database transaction commits. This results in false unauthorized access exceptions and broken user flows when users attempt to enter dynamic peer groups.
5. **Database Storage Exhaustion**: Unbounded data accumulation in dynamic coordination applications leads to rapid storage exhaustion, requiring expensive server architectures and manual administration.

Therefore, there is an urgent and critical need for an integrated system that provides secure, institutional-domain-anchored identity verification, hardware-level transactional safety invariants, client-side zero-latency pre-ingestion media compression, and deterministic ephemeral lifecycle management.

---

### 7. OBJECTS OF THE PRESENT INVENTION
* **Primary Object**: To provide a lightweight, purpose-driven ephemeral coordination system that dynamically aggregates peers without permanent social network tracking.
* **Another Object**: To implement an anti-spoofing cryptographic identity binding architecture where institutional domain credentials permanently lock core registration attributes at the database engine level.
* **Another Object**: To provide a database-enforced transactional invariant engine that guarantees atomic capacity allocation, prevents simultaneous overbooking via distributed row locks, and blocks demographic evasion in safety-restricted peer channels.
* **Another Object**: To provide a client-side zero-latency image ingestion pipeline that downscales and encodes media directly within client memory prior to transmission, paired with multi-tier disk and memory caching.
* **Another Object**: To implement a dual-layer access verification and optimistic state synchronization protocol that eliminates race conditions between transaction commits and real-time WebSocket channel mounting.
* **Another Object**: To enforce an autonomous, departure-relative sliding window lifecycle that archives and permanently purges ephemeral groups without administrative intervention.

---

### 8. SUMMARY OF THE INVENTION
The present invention provides a distributed system and computer-implemented method for secure, verified ephemeral peer coordination and zero-latency multi-tenant state synchronization.

The system comprises:
1. **An Institutional Identity Verification and Invariant Locking Module**: Configured to evaluate user authentication tokens, enforce institutional domain validations, and execute database-level triggers that immutably freeze critical user identifiers upon verification, barring any client-side payload modification.
2. **An Atomic Concurrency and Access Guard Engine**: Incorporating exclusive row-level locking (`FOR UPDATE`) within PostgreSQL database transactions to evaluate real-time capacity thresholds before committing peer memberships, thereby preventing overbooking anomalies.
3. **An Invariant-Guarded Demographic Routing Subsystem**: Enforcing gender-specific safety constraints at the database storage and query layer, where user demographic markers cannot be mutated while actively participating in or hosting restricted peer groups.
4. **A Client-Side Pre-Ingestion Media Pipeline**: Executing device-level canvas rendering to transcode high-resolution imagery into high-efficiency formats (WebP) with max dimensional bounding boxes, reducing payload weight by greater than 95% before network transmission, integrated with service worker disk-level caching.
5. **A Race-Condition-Free Ephemeral Synchronization Protocol**: Utilizing deterministic asynchronous awaiting of membership insertion combined with dual-tier client fallback verification, eliminating false access denials during real-time WebSocket room creation.
6. **A Temporal Sliding-Window Pruning Subsystem**: Automatically computing expiration relative to peer departure time (`departure_time + offset`), providing in-transit operational persistence while scheduling automated cron purges of stale messages and expired coordination rooms.

---

### 9. DETAILED DESCRIPTION OF PREFERRED EMBODIMENTS

#### A. System Architecture Overview
The system comprises a mobile client application executed on a user computing device (operating within a progressive web app or native container environment), communicative with an application runtime server and a distributed relational database management system (RDBMS) equipped with real-time publish-subscribe WebSocket capabilities and Row-Level Security (RLS).

#### B. Institutional Identity Locking & Privilege Escalation Prevention
When a user authenticates using an institutional domain (e.g., academic email domain), the server-side authentication engine emits an authenticated token. A database-level trigger (`protect_profile_updates`) intercepts any insert or update operation on the user profile registry:
* The trigger validates whether the caller's email matches pre-authorized institutional domains.
* If unverified or external, the database autonomously overwrites any client-submitted `is_student_verified` flag to `false`.
* Once an institutional student registration number is verified, the trigger permanently locks the registration field against subsequent update operations, rejecting tampering attempts with a database-level exception.

#### C. Atomic Capacity Allocation & Anti-Overbooking Mechanism
To prevent simultaneous multi-user overbooking under high network concurrency:
1. Upon receiving an aggregation join request, the database transaction initiates a row lock (`SELECT ... FOR UPDATE`) on the target group record.
2. The engine computes current confirmed participants against a strict upper bound capacity limit.
3. If confirmed count meets or exceeds the threshold, the transaction rolls back and emits a capacity exception.
4. If capacity remains, the member row is inserted and the group participant count is atomically incremented.

#### D. Demographic Channel Invariant Enforcement
For safety-critical peer groups (e.g., female-only peer travel):
* Group creation requires validation of the host's demographic attribute.
* Database RLS policies filter group discovery such that non-qualifying peers cannot read or query the group.
* To prevent evasion attacks, a database trigger detects if a user attempts to alter their demographic marker while actively participating in an open female-only group, raising an exception that aborts the mutation.

#### E. Client-Side Pre-Ingestion Media Downscaling & Multi-Tier Caching
To achieve zero-latency media operations over mobile networks:
1. The client intercepts raw media selection prior to upload.
2. A client-side canvas element dynamically scales image dimensions to a constrained bounding box (e.g., 384px) and compresses the image buffer into WebP binary format.
3. An immediate local blob URL is generated and presented optimistically in the user interface (0ms visual delay).
4. The compressed binary is transmitted with immutable cache headers (`max-age=31536000, immutable`).
5. A client Service Worker intercepts inbound media URLs, storing them in local `CacheStorage`, while an in-memory registry caches decoded image bit-maps, eliminating blank layout shifts.

#### F. Dual-Layer Access Verification & Race Condition Elimination
During transitions from ride discovery to real-time communication channels:
1. The client join procedure awaits database membership insertion before triggering view transitions.
2. Upon mounting the real-time channel, a primary query checks local cached memberships.
3. If a race condition or replication delay occurs, a secondary direct fallback query (`maybeSingle`) executes against the membership registry before any access restriction is asserted.
4. Channel access is maintained, preventing spurious kickouts.

#### G. Temporal Ephemeral Lifecycle Engine
The lifespan of each dynamic coordination group is dynamically bounded:
$$\text{Expiration Time} = \text{Departure Time} + \Delta t_{\text{grace}}$$
Where $\Delta t_{\text{grace}}$ (e.g., 5 hours) maintains active communication during transit.
A serverless scheduled worker periodically invokes a database stored procedure (`cleanup_old_rides`) which executes cascade deletions of messages and memberships for all groups satisfying:
$$\text{Departure Time} < \text{Current Time} - T_{\text{retention}}$$
Where $T_{\text{retention}}$ is a defined threshold (e.g., 7 days), guaranteeing bounded storage utilization.

---

### 10. PRELIMINARY CLAIMS (FOR PRIORITY DATE ESTABLISHMENT)
*We claim:*

1. A computer-implemented system for secure ephemeral peer coordination over a distributed network, comprising:
   * at least one processor and a memory storing instructions;
   * an authentication module validating domain-specific credentials of a plurality of users;
   * an invariant enforcement module executing at a database engine level to immutably bind verified identification attributes to user records;
   * a transactional locking module configured to execute atomic row locks on ephemeral group entities, enforcing strict capacity bounds against concurrent join requests; and
   * an ephemeral communication engine providing scoped real-time communication channels whose lifespans are governed by a departure-relative temporal sliding window.

2. The system as claimed in claim 1, further comprising an invariant-guarded demographic routing module that restricts visibility and joining of designated groups based on verified demographic attributes, and blocks demographic modification requests at the database engine level during active group participation.

3. The system as claimed in claim 1, further comprising a client-side media pre-ingestion pipeline that programmatically resizes and compresses user-selected media directly within client device memory to a compressed format before transmission, and retrieves cached media via a client service worker Cache-First strategy.

4. The system as claimed in claim 1, wherein the transition into said real-time communication channel utilizes a dual-tier access verification protocol that awaits database membership insertion and executes a fallback database query prior to evaluating channel eviction, thereby eliminating asynchronous client-server race conditions.

5. A method for autonomous database storage bounding in an ephemeral peer coordination network, comprising:
   * establishing an ephemeral coordination entity with a designated target execution timestamp;
   * maintaining an active communication channel associated with said entity until a grace period after said execution timestamp has elapsed; and
   * autonomously executing scheduled batch cascade deletions of communication records and membership links for entities whose execution timestamp exceeds a predetermined retention interval.

---

### 11. ABSTRACT
A system and method for secure, verified ephemeral peer coordination and zero-latency multi-tenant state synchronization in mobile networks are disclosed. The system integrates institutional domain authentication with database-level invariant triggers that permanently lock student credentials and demographic markers, preventing privilege escalation and evasion in safety-restricted peer groups. An atomic row-locking mechanism eliminates overbooking anomalies during concurrent join operations. A client-side pre-ingestion media pipeline downscales high-resolution camera images into compressed WebP formats in device memory prior to transmission, paired with multi-tier service worker and memory caching for zero-latency UI rendering. Spurious access rejections during real-time communication room instantiation are eliminated via a dual-layer access verification protocol. Ephemeral groups and associated communication streams are autonomously expired and purged via a departure-relative temporal sliding window, guaranteeing bounded database storage utilization in high-concurrency campus environments.

---
*(End of Provisional Specification)*
