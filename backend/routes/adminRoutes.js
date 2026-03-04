const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getLocations, createLocation, updateLocation, toggleLocationStatus,
    getCompanies, createCompany, updateCompany, toggleCompanyStatus,
    getSites, createSite, updateSite, toggleSiteStatus,
    getDepartments, createDepartment, updateDepartment, toggleDepartmentStatus,
    getCategories, createCategory, updateCategory, toggleCategoryStatus,
    getUsers, createUser, updateUser, toggleUserStatus, deleteUser,
    getEmailSettings, saveEmailSettings,
    getPendingUsers, approveUser, rejectUser,
    getAutoReportSettings, saveAutoReportSettings
} = require('../controllers/adminController');
const { adminDeleteTicket, getTicketBoard } = require('../controllers/ticketController');
const {
    deviceTypes, operatingSystems, msOffices, serviceLifeGroups, scriptInstallStatuses
} = require('../controllers/masterDataController');
const attachmentSettingsController = require('../controllers/attachmentSettingsController');

// All routes here require Admin role
router.use(protect);
router.use(authorize('admin'));

// Location Routes
router.get('/locations', getLocations);
router.post('/locations', createLocation);
router.put('/locations/:id', updateLocation);
router.patch('/locations/:id/status', toggleLocationStatus);

// Company Routes
router.get('/companies', getCompanies);
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompany);
router.patch('/companies/:id/status', toggleCompanyStatus);

// Site Routes
router.get('/sites', getSites);
router.post('/sites', createSite);
router.put('/sites/:id', updateSite);
router.patch('/sites/:id/status', toggleSiteStatus);

// Department Routes
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.patch('/departments/:id/status', toggleDepartmentStatus);

// Category Routes
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.patch('/categories/:id/status', toggleCategoryStatus);

// User Routes
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

// Ticket Management (Admin can delete any ticket)
router.get('/tickets', getTicketBoard);
router.delete('/tickets/:id', adminDeleteTicket);

// --- Master Data for PC Inventory ---
// Device Types
router.get('/device-types', deviceTypes.getAll);
router.post('/device-types', deviceTypes.create);
router.put('/device-types/:id', deviceTypes.update);
router.patch('/device-types/:id/status', deviceTypes.toggleStatus);

// Operating Systems
router.get('/operating-systems', operatingSystems.getAll);
router.post('/operating-systems', operatingSystems.create);
router.put('/operating-systems/:id', operatingSystems.update);
router.patch('/operating-systems/:id/status', operatingSystems.toggleStatus);

// MS Offices
router.get('/ms-offices', msOffices.getAll);
router.post('/ms-offices', msOffices.create);
router.put('/ms-offices/:id', msOffices.update);
router.patch('/ms-offices/:id/status', msOffices.toggleStatus);

// Service Life Groups


// Script Install Statuses
router.get('/script-install-statuses', scriptInstallStatuses.getAll);
router.post('/script-install-statuses', scriptInstallStatuses.create);
router.put('/script-install-statuses/:id', scriptInstallStatuses.update);
router.patch('/script-install-statuses/:id/status', scriptInstallStatuses.toggleStatus);

// Email Settings
router.get('/email-settings', getEmailSettings);
router.post('/email-settings', saveEmailSettings);

// Pending User Approval (also accessible by IT via separate route)
router.get('/pending-users', getPendingUsers);
router.put('/pending-users/:id/approve', approveUser);
router.delete('/pending-users/:id/reject', rejectUser);

// Auto Report Settings
router.get('/auto-report', getAutoReportSettings);
router.post('/auto-report', saveAutoReportSettings);

// Attachment Settings
router.get('/attachment-settings', attachmentSettingsController.getSettings);
router.put('/attachment-settings', attachmentSettingsController.updateSettings);

module.exports = router;


