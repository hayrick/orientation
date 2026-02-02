# Requirements: Orientation App (Parcoursup Companion)

## 1. Project Overview
The **Orientation App** is a specialized decision-support system (DSS) designed to assist French students in navigating the **Parcoursup** ecosystem. It focuses specifically on the "Bac Général" pathway, providing high-fidelity data on competitive and academic tracks (CPGE, Integrated Schools, IEP, etc.).

## 2. Technical Stack & Architecture
* **Backend:** Node.js (v20+) using the **Antigravity Framework**.
* **Architecture:** **Hexagonal (Ports & Adapters)**.
* **Frontend:** **React** (v18+) for the web interface.
* **Data Visualization:** Interactive charts, bars, and pathway diagrams (e.g., Recharts, D3, or Nivo).

---

## 3. Core Functional Requirements

### 3.1. Student Profile & Eligibility Matching
Users define their academic identity to filter available options.
* **Student Profile Inputs:** * Exactly two (2) "Enseignements de Spécialité" (e.g., Maths, Physique-Chimie, SES).
    * Global average grade (0-20 scale).
* **Matching Engine:** * **Prerequisites:** Filters out "Formations" incompatible with the student's specialties.
    * **Probability Score:** Uses the average grade against historical admission data to estimate entry chances.

### 3.2. CPGE Success Analytics (Reverse Search)
A specialized feature for students targeting "Grandes Écoles."
* **Target Selection:** User selects a target Engineering or Business School (e.g., HEC, Polytechnique).
* **Feeder Mapping:** The app lists all **CPGEs** (Classes Préparatoires) that successfully sent students to that specific school.
* **Success Metrics:** Displays the percentage of success (Students Integrated / Total Students in the track).

### 3.3. Web Interface & Data Visualization
The application is web-based and prioritizes visual data representation:
* **Formation search:** Allow to search a formation by name, location, category.
* **Success Pathways:** Visual flow diagrams showing the transition from CPGE to Target Schools.
* **Comparison Bars:** Benchmarking success rates across different CPGE locations.
* **Branch Mapping:** Interactive maps showing **SchoolLocations** and their specific **Formations**.

---

## 4. Domain Entity Model (Hexagonal Core)

The application core logic is structured around these primary entities:

| Entity | Description | Relationships |
| :--- | :--- | :--- |
| **Student** | The end-user profile. | Has a Name, 2 Specialties and 1 AverageGrade. |
| **School** | The parent institution (e.g., "CentraleSupélec"). | Owns multiple `SchoolLocation` entities. Has various ratings (l'étudiant, usine nouvelle, figaro etudiant). |
| **SchoolLocation** | A specific campus/branch (e.g., "Gif-sur-Yvette"). A `SchoolLocation` is a town which is located in a Department, a Department is in a Region | Belongs to a `School`. Hosts specific `Formation` offerings. |
| **Formation** | The actual training/cursus (e.g., "MPSI", "Licence Droit"). | Linked to a `SchoolLocation`. Includes selectivity data from Parcoursup and as a description web page on Parcoursup  | 
| **MasterFormation** | A training/cursus (e.g., "Master in Political sciences") availble after a CPGE. | Linked to a `SchoolLocation`. Includes selectivity data from L'Etudiant and as a description web page on Parcoursup L'Etudiant whith its ranking in the master area (eg, sciences, business). Linked to several `Formation` which lead to this `masterFormation` | 



---

## 5. Non-Functional Requirements
* **Architecture Integrity:** Strict separation of Domain (Business Logic) from Infrastructure (Antigravity/Database).
* **Visualization Performance:** Use of React optimization patterns for rendering large datasets.
* **Data Validation:** Strict typing and validation (Zod) for Parcoursup OpenData ingestion.

---

## 6. Key User Stories
* **As a student**, I want to see which CPGEs in Paris have the highest success rate for *Ecole des Mines*. I can filter on town, department or region.
* **As a student**, I want to input my "Maths/Physics" profile and see a list of Engineering Schools where my grade (15/20) makes me a "likely" candidate. I can choose to see the result on a map or a list.
* **As a student**, I want to see which specific branch of a university offers the "PASS" (Medicine) formation.