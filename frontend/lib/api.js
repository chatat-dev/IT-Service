// Central API URL configuration
// All API calls should import this so the backend URL can be changed in one place.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5250';

export default API_URL;
