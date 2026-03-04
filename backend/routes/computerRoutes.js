const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getComputers,
    getComputerById,
    createComputer,
    updateComputer,
    searchEmployee,
    addComputerNote,
    deleteComputer,
    searchComputersByEmployee,
    getComputerRepairHistory,
    addManualRepairLog,
    deleteManualRepairLog,
    updateManualRepairLog,
    getITStaffList
} = require('../controllers/computerController');

router.use(protect);

// Basic user/IT/admin can GET
router.get('/', getComputers);
router.get('/search-emp', searchEmployee);
router.get('/search-by-employee', searchComputersByEmployee);
router.get('/it-staff', getITStaffList);
router.get('/:id', getComputerById);
router.get('/:id/repair-history', getComputerRepairHistory);

// IT and Admin can create/update
router.use(authorize('it', 'admin'));
router.post('/', createComputer);
router.put('/:id', updateComputer);
router.post('/:id/notes', addComputerNote);
router.post('/:id/repair-logs', addManualRepairLog);
router.put('/:id/repair-logs/:logId', updateManualRepairLog);
router.delete('/:id/repair-logs/:logId', deleteManualRepairLog);
router.delete('/:id', deleteComputer);

module.exports = router;
