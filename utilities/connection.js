// schoolManagementSchema.js
const mongoose = require('mongoose');
const url = process.env.MONGO_URL;

mongoose.Promise = global.Promise;
mongoose.set('strictQuery', true);

/* ======================================================
   DB CONNECTION
====================================================== */
let _connectionPromise = null;

async function connectDB() {
    if (mongoose.connection.readyState >= 1) return;
    if (!_connectionPromise) {
        _connectionPromise = mongoose.connect(url, { maxPoolSize: 50 });
    }
    console.log('MongoDB connected');
    return _connectionPromise;
}

/* ======================================================
   BASE USER (Discriminator Pattern)
====================================================== */

const userOptions = {
    collection: 'users',
    discriminatorKey: 'role',
    timestamps: { createdAt: 'createdOn', updatedAt: false }
};

const baseUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNo: { type: String, required: true },
    password: { type: String, required: true },
    profileStatus: { type: String, default: 'Incomplete' },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    profilePhoto: String,
    status: { type: String, default: 'active' },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin', 'superAdmin'],
        required: true
    },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, userOptions);

// Efficient queries: filter users by school + branch + role
baseUserSchema.index({ schoolId: 1, branchId: 1, role: 1 });

const User = mongoose.model('User', baseUserSchema);

/* ======================================================
   SCHOOL (SaaS Ready)
====================================================== */

const schoolSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },

    code: {
        type: String,
        unique: true,
        required: true,
        uppercase: true,
        trim: true
    },

    address: String,
    logoUrl: String,
    phone: String,
    email: String,

    subscriptionPlan: {
        type: String,
        enum: ['basic', 'standard', 'premium'],
        default: 'basic'
    },

    subscriptionStatus: {
        type: String,
        enum: ['active', 'expired', 'trial'],
        default: 'trial'
    },

    subscriptionExpiry: Date,

    maxBranches: { type: Number, default: 1 },
    currentStudentCount: { type: Number, default: 0 },
    billingAmount: { type: Number, default: 0 },
    billingCycleStart: Date,
    billingCycleEnd: Date,
    lastPaymentDate: Date,

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

const School = mongoose.model('School', schoolSchema);

/* ======================================================
   BRANCH
====================================================== */

const branchSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },

    name: { type: String, required: true },
    code: String,
    address: String,
    phone: String,
    email: String,
    principalName: String,

    isMain: { type: Boolean, default: false },

    enabledModules: {
        exam: { type: Boolean, default: true },
        attendance: { type: Boolean, default: true },
        fees: { type: Boolean, default: true },
        notifications: { type: Boolean, default: true }
    },

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

// Only one main branch per school
branchSchema.index(
    { schoolId: 1, isMain: 1 },
    { unique: true, partialFilterExpression: { isMain: true } }
);

// Unique branch code per school
branchSchema.index(
    { schoolId: 1, code: 1 },
    { unique: true, sparse: true }
);

const Branch = mongoose.model('Branch', branchSchema);

/* ======================================================
   STUDENT
====================================================== */

const studentSchema = new mongoose.Schema({
    gender: String,
    dob: Date,
    religion: String,
    casteCategory: String,
    bloodGroup: String,
    motherTongue: String,

    fatherName: String,
    fatherOccupation: String,
    motherName: String,
    motherOccupation: String,
    guardianName: String,
    annualIncome: Number,

    currentAddress: String,
    permanentAddress: String,
    state: String,
    district: String,
    mandal: String,
    village: String,
    pincode: String,

    aadharNumber: String,
    govtRegType: String,
    govtRegId: String,
    hasDisability: Boolean,
    disabilityCertFile: String,

    previousSchoolName: String,
    previousClass: String,
    previousMarks: String,
    transferCertNo: String,

    admissionDate: Date,
    admissionNumber: String,
    academicYear: String,

    admittedClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    groupSection: { type: mongoose.Schema.Types.ObjectId, ref: 'SubGroup', required: true },

    loginMobile: String,
    loginEmail: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
});

// General lookup indexes
studentSchema.index({ schoolId: 1, branchId: 1 });
studentSchema.index({ schoolId: 1, admittedClass: 1, groupSection: 1 });

// admissionNumber stays unique per school — this is the real student identifier
studentSchema.index(
    { schoolId: 1, admissionNumber: 1 },
    {
        unique: true,
        partialFilterExpression: { role: 'student', admissionNumber: { $type: 'string' } }
    }
);

// Aadhar scoped to schoolId — same student can join a different school later
studentSchema.index(
    { schoolId: 1, aadharNumber: 1 },
    {
        unique: true,
        partialFilterExpression: { role: 'student', aadharNumber: { $type: 'string' } }
    }
);

const Student = User.discriminator('student', studentSchema);

/* ======================================================
   TEACHER
====================================================== */

const teacherSchema = new mongoose.Schema({
    gender: String,
    dob: Date,
    bloodGroup: String,
    motherTongue: String,

    aadharNumber: String,
    pancard: String,

    currentAddress: String,
    permanentAddress: String,
    state: String,
    district: String,
    mandal: String,
    village: String,
    pincode: String,

    highestQualification: String,
    universityName: String,
    yearOfPassing: Number,
    educationExperience: Number,
    educationSubjects: String,
    workExperience: Number,
    expertiseSubjects: String,

    bankName: String,
    accountNumber: String,
    ifscCode: String,
    upiId: String,

    teacherID: String,
    loginEmail: String     // REMOVED: unique index — no need to enforce uniqueness here
});

// General lookup index
teacherSchema.index({ schoolId: 1, branchId: 1 });

// teacherID stays unique per school — this is the real teacher identifier
teacherSchema.index(
    { schoolId: 1, teacherID: 1 },
    {
        unique: true,
        partialFilterExpression: { role: 'teacher', teacherID: { $type: 'string' } }
    }
);

// Aadhar scoped to schoolId — same teacher can join a different school later
teacherSchema.index(
    { schoolId: 1, aadharNumber: 1 },
    {
        unique: true,
        partialFilterExpression: { role: 'teacher', aadharNumber: { $type: 'string' } }
    }
);

const Teacher = User.discriminator('teacher', teacherSchema);

/* ======================================================
   ADMIN
====================================================== */

const adminSchema = new mongoose.Schema({});
const Admin = User.discriminator('admin', adminSchema);

/* ======================================================
   SUPER ADMIN
====================================================== */

const superAdminSchema = new mongoose.Schema({
    status: { type: String, default: 'active' }
});
const SuperAdmin = User.discriminator('superAdmin', superAdminSchema);

/* ======================================================
   CLASS
====================================================== */

const classSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },

    name: { type: String, required: true },
    academicYear: { type: String, required: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

classSchema.index({ branchId: 1, name: 1, academicYear: 1 }, { unique: true });
classSchema.index({ schoolId: 1, branchId: 1 });

const Class = mongoose.model('Class', classSchema);

/* ======================================================
   SUB GROUP
====================================================== */

const subGroupSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    name: { type: String, required: true },

    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    subjectTeacherAssignments: [{
        subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]

}, { timestamps: true });

subGroupSchema.index({ schoolId: 1, branchId: 1, class: 1, name: 1 }, { unique: true });

const SubGroup = mongoose.model('SubGroup', subGroupSchema);

/* ======================================================
   SUBJECT
====================================================== */

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: String,
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

subjectSchema.index({ schoolId: 1, branchId: 1, name: 1 }, { unique: true, sparse: true });

const Subject = mongoose.model('Subject', subjectSchema);

/* ======================================================
   EXAM
====================================================== */

const examSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },

    title: { type: String, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    subGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'SubGroup', required: true },

    date: { type: Date, required: true },
    notes: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

examSchema.index({ schoolId: 1, branchId: 1, date: 1 });

const Exam = mongoose.model('Exam', examSchema);

/* ======================================================
   MARKS
====================================================== */

const marksSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    marksObtained: Number,
    maxMarks: Number
}, { timestamps: true });

marksSchema.index({ exam: 1, student: 1 }, { unique: true });
marksSchema.index({ branchId: 1, exam: 1, student: 1 });

const Marks = mongoose.model('Marks', marksSchema);

/* ======================================================
   ATTENDANCE
====================================================== */

const attendanceSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'SubGroup', required: true },

    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'leave', 'half_day_first', 'half_day_second'], required: true }

}, { timestamps: true });

// Lead with subGroup for bulk daily inserts (all students in a section)
attendanceSchema.index({ subGroup: 1, date: 1, student: 1 }, { unique: true });
attendanceSchema.index({ schoolId: 1, branchId: 1, date: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

/* ======================================================
   FEES
====================================================== */

const feesSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    academicYear: { type: String, required: true },
    feeType: { type: String, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },

    // Production fields
    dueDate: { type: Date },
    discount: { type: Number, default: 0, min: 0 },
    discountReason: { type: String, default: '' },
    fine: { type: Number, default: 0, min: 0 },
    fineReason: { type: String, default: '' },
    effectiveAmount: { type: Number, default: 0 },  // totalAmount - discount + fine
    remarks: { type: String, default: '' },

    // Audit
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    status: {
        type: String,
        enum: ['paid', 'partial', 'unpaid', 'overdue'],
        default: 'unpaid'
    },
    lastPaymentDate: Date
}, { timestamps: true });

feesSchema.pre('save', function (next) {
    // Compute effective amount
    this.effectiveAmount = (this.totalAmount || 0) - (this.discount || 0) + (this.fine || 0);
    if (this.effectiveAmount < 0) this.effectiveAmount = 0;

    this.dueAmount = this.effectiveAmount - (this.paidAmount || 0);
    if (this.dueAmount < 0) this.dueAmount = 0;

    if (this.dueAmount <= 0) {
        this.status = 'paid';
    } else if (this.dueDate && new Date(this.dueDate) < new Date() && this.status !== 'paid') {
        this.status = 'overdue';
    } else if (this.paidAmount > 0) {
        this.status = 'partial';
    } else {
        this.status = 'unpaid';
    }

    next();
});

feesSchema.index({ schoolId: 1, branchId: 1, academicYear: 1 });
feesSchema.index({ schoolId: 1, student: 1, academicYear: 1, feeType: 1 }, { unique: true });
feesSchema.index({ status: 1, dueDate: 1 });

const Fees = mongoose.model('Fees', feesSchema);

/* ======================================================
   PAYMENT TRANSACTION (Immutable Ledger)
====================================================== */

const paymentTransactionSchema = new mongoose.Schema({
    feeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fees', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
        type: String,
        enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'online', 'other'],
        default: 'cash'
    },
    paymentReference: { type: String, default: '' },  // Transaction ID / Cheque No
    receiptNumber: { type: String, unique: true, required: true },

    // Audit
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: { type: String, default: '' },

    // Refund support
    refundedAmount: { type: Number, default: 0, min: 0 },
    refundReason: { type: String, default: '' },
    refundDate: { type: Date },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    status: {
        type: String,
        enum: ['completed', 'refunded', 'partial_refund'],
        default: 'completed'
    },

    paymentDate: { type: Date, default: Date.now }
}, { timestamps: true });

paymentTransactionSchema.index({ feeId: 1, paymentDate: -1 });
paymentTransactionSchema.index({ student: 1, schoolId: 1, paymentDate: -1 });
paymentTransactionSchema.index({ receiptNumber: 1 });

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

/* ======================================================
   NOTIFICATION
====================================================== */

const notificationSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['email', 'sms', 'system'] },

    title: String,
    body: String,
    triggerType: String,

    status: { type: String, default: 'pending' },

    sentAt: { type: Date, default: Date.now }

}, { timestamps: true });

notificationSchema.index({ schoolId: 1, branchId: 1, sentAt: 1 });

// 90-day TTL — auto-delete old notifications
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const Notification = mongoose.model('Notification', notificationSchema);

/* ======================================================
   DASHBOARD NOTIFICATION (Announcements)
====================================================== */

const dashboardNotificationSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    title: { type: String, required: true },
    message: { type: String, required: true },

    targetAudience: {
        type: String,
        enum: ['teacher', 'student', 'both'],
        required: true
    },

    endDate: { type: Date, required: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

dashboardNotificationSchema.index({ schoolId: 1, branchId: 1, endDate: 1, targetAudience: 1 });

const DashboardNotification = mongoose.model('DashboardNotification', dashboardNotificationSchema);

/* ======================================================
   EXPORTS
====================================================== */

module.exports = {
    connectDB,
    User,
    Student,
    Teacher,
    Admin,
    SuperAdmin,
    School,
    Branch,
    Class,
    SubGroup,
    Subject,
    Exam,
    Marks,
    Attendance,
    Fees,
    PaymentTransaction,
    Notification,
    DashboardNotification
};