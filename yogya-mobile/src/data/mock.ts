/**
 * Mock Data — Yogya
 *
 * ⚠️ DEMONSTRATION DATA ONLY
 * This data does not represent real government schemes or verified opportunities.
 * It exists solely for UI development and testing purposes.
 *
 * Real data will be provided by:
 * - Person 2: FastAPI backend
 * - Person 4: Verified scholarship, scheme, and training data
 */

import type { Opportunity } from '@/types';

export const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'demo-1',
    title: 'National Merit Scholarship',
    description:
      'A merit-based scholarship for students who have demonstrated exceptional academic performance in Class 10 and 12 examinations.',
    type: 'scholarship',
    provider: 'Ministry of Education',
    deadline: '2026-12-31',
    amount: '₹12,000/year',
    eligibilitySummary: 'Class 12 pass with 85%+ marks, family income below ₹6 LPA',
    applicationUrl: undefined,
    isVerified: false,
    lastUpdated: '2026-10-01T00:00:00Z',
    benefits: [
      '₹12,000 direct annual grant paid to student bank account',
      'Renewable throughout undergraduate degree upon maintaining 75% score',
      'Certificate of Academic Excellence issued by Ministry of Education',
    ],
    eligibilityCriteria: [
      'Class 12 completed from any recognized central or state board',
      'Minimum 85% aggregate score in final board examinations',
      'Annual family / parental income must be below ₹6,00,000',
      'Applicant must be an Indian citizen',
    ],
    documentsRequired: [
      'Class 10 and Class 12 official mark sheets',
      'Valid family income certificate issued by Tehsildar or revenue authority',
      'Student bank account passbook copy (with IFSC code)',
      'Government-issued photo identification (e.g. Aadhaar / Voter ID)',
    ],
    applicationSteps: [
      'Check national scholarship portal announcements during opening window',
      'Register student profile and verify email or mobile number',
      'Upload verified mark sheets and income documentation',
      'Obtain digital or physical verification from your school/college principal',
      'Track provisional merit list publication and fund disbursement status',
    ],
  },
  {
    id: 'demo-2',
    title: 'PM Kaushal Vikas Yojana',
    description:
      'A skill development training program offering free industry-relevant training and certification to Indian youth.',
    type: 'training',
    provider: 'Ministry of Skill Development',
    deadline: undefined,
    amount: 'Free Training + ₹8,000 stipend',
    eligibilitySummary: 'Age 15-45, Indian citizen, class 10 pass',
    applicationUrl: undefined,
    isVerified: false,
    lastUpdated: '2026-10-01T00:00:00Z',
    benefits: [
      '100% government-sponsored, zero-cost skill certification course',
      'Monthly stipend of up to ₹8,000 upon consistent attendance',
      'National Skill Qualification Framework (NSQF) recognized diploma',
      'Placement linkages and rozgar mela access across registered employers',
    ],
    eligibilityCriteria: [
      'Indian citizens aged between 15 and 45 years',
      'Class 10 passed from any recognized board (course-dependent)',
      'Aadhaar number linked with an active bank account',
      'Prioritized for school/college dropouts and unemployed rural youth',
    ],
    documentsRequired: [
      'Class 10 passing certificate or marks statement',
      'Aadhaar card copy for biometric verification',
      'Active bank account passbook copy for DBT transfer',
      'Two recent passport-sized photographs',
    ],
    applicationSteps: [
      'Locate the nearest accredited Pradhan Mantri Kaushal Kendra (PMKK)',
      'Choose a suitable vocational trade (e.g. Solar Technician, Healthcare, Electronics)',
      'Submit self-attested documents at the center for batch allocation',
      'Complete the classroom and hands-on laboratory curriculum',
      'Appear for sector skill council assessment and receive your certification',
    ],
  },
  {
    id: 'demo-3',
    title: 'Startup India Seed Fund',
    description:
      'Financial assistance to startups for proof of concept, prototype development, product trials, and market entry.',
    type: 'scheme',
    provider: 'DPIIT',
    deadline: '2027-03-31',
    amount: 'Up to ₹50 Lakhs',
    eligibilitySummary: 'Registered startup, less than 2 years old, Indian incorporated',
    applicationUrl: undefined,
    isVerified: false,
    lastUpdated: '2026-10-01T00:00:00Z',
    benefits: [
      'Up to ₹20 Lakhs grant for proof of concept and prototype development',
      'Up to ₹50 Lakhs debt or convertible debenture for market launch',
      'Access to state incubators, faculty mentorship, and investor network',
    ],
    eligibilityCriteria: [
      'DPIIT-recognized startup incorporated not more than 2 years ago',
      'Startup must have an innovative business concept with clear market potential',
      'Indian promoters must hold at least 51% shareholding in the enterprise',
      'Should not have received more than ₹10 Lakhs of monetary support under other central schemes',
    ],
    documentsRequired: [
      'DPIIT Startup Recognition certificate',
      'Pitch deck and detailed project feasibility report',
      'Company incorporation certificate and PAN card',
      'Audited or self-certified balance sheet (if applicable)',
    ],
    applicationSteps: [
      'Apply online on the official Startup India portal',
      'Select up to 3 approved incubators aligned with your sector',
      'Present pitch deck to the Incubator Seed Management Committee (ISMC)',
      'Sign incubator agreement upon selection and receive fund tranches based on milestones',
    ],
  },
  {
    id: 'demo-4',
    title: 'National Apprenticeship Promotion Scheme (NAPS-2)',
    description:
      'Government scheme promoting apprenticeship training across industries, co-funding monthly stipends to students who passed Class 10, Class 12, or ITI.',
    type: 'job',
    provider: 'Ministry of Skill Development & Entrepreneurship',
    deadline: undefined,
    amount: 'Stipend ₹7,000 - ₹10,000/month',
    eligibilitySummary: 'Age 14+, Class 10/12/ITI pass, Indian citizen',
    applicationUrl: 'https://www.apprenticeshipindia.gov.in/',
    isVerified: false,
    lastUpdated: '2026-10-16T00:00:00Z',
    benefits: [
      'Monthly stipend of ₹7,000 to ₹10,000/month with direct DBT government co-funding',
      'On-the-job industrial experience and formal workplace training',
      'National Apprenticeship Certificate recognized across public and private sectors',
    ],
    eligibilityCriteria: [
      'Minimum 14 years of age',
      'Passed Class 10, Class 12, or recognized ITI trade course',
      'Indian citizen with Aadhaar-linked active bank account',
    ],
    documentsRequired: [
      'Class 10 / 12 mark sheet or ITI passing certificate',
      'Aadhaar card copy for e-KYC',
      'Bank account details (passbook / cancelled cheque)',
    ],
    applicationSteps: [
      'Register profile on the official Apprenticeship India portal (apprenticeshipindia.gov.in)',
      'Complete e-KYC verification using Aadhaar number',
      'Search and apply for designated or optional trade apprenticeship vacancies',
      'Sign digital apprenticeship contract with registered employer establishment',
    ],
  },
];

/**
 * Helper to look up an opportunity by id.
 * Handles both 'demo-1' and numeric '1' identifiers seamlessly.
 */
export function getOpportunityById(id: string): Opportunity | undefined {
  if (!id) return undefined;
  const normalized = id.trim().toLowerCase();
  return MOCK_OPPORTUNITIES.find((opp) => {
    const oppId = opp.id.toLowerCase();
    if (oppId === normalized) return true;
    if (oppId === `demo-${normalized}`) return true;
    if (`demo-${oppId}` === normalized) return true;
    // Map '1' to 'demo-1', '2' to 'demo-2', '3' to 'demo-3', '4' to 'demo-4'
    if (normalized === '1' && oppId === 'demo-1') return true;
    if (normalized === '2' && oppId === 'demo-2') return true;
    if (normalized === '3' && oppId === 'demo-3') return true;
    if (normalized === '4' && oppId === 'demo-4') return true;
    return false;
  });
}
