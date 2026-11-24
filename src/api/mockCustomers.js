import { MOCK_PASSWORD, MOCK_CREATED_AT } from './mockPartners';

export const MOCK_CUSTOMERS = [
  {
    id: 'mock-customer-anna',
    email: 'anna.customer@example.com',
    password: MOCK_PASSWORD,
    contact: 'email',
    firstName: 'Anna',
    lastName: 'Smith',
    role: 'customer',
    currency: 'USD',
    createdAt: MOCK_CREATED_AT,
  },
  {
    id: 'mock-customer-david',
    email: 'david.customer@example.com',
    password: MOCK_PASSWORD,
    contact: 'phone',
    phone: '+64 21 555 0201',
    firstName: 'David',
    lastName: 'Brown',
    role: 'customer',
    currency: 'USD',
    createdAt: MOCK_CREATED_AT,
  },
];
