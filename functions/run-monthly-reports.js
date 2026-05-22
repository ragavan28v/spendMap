const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const {
  buildMonthlyReportData,
  buildMonthlyReportEmailHtml,
  buildMonthlyReportPdfBytes,
  buildMonthlyReportXlsxBytes,
  getTransactionsForWindow,
} = require('./report');

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required.');
  }
  return JSON.parse(raw);
}

function getMailer() {
  const gmailUser = process.env.REPORTS_GMAIL_USER;
  const gmailPassword = process.env.REPORTS_GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPassword) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPassword },
  });
}

async function runMonthlyReports() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(getServiceAccount()),
    });
  }

  const db = admin.firestore();
  const usersSnapshot = await db.collection('users').get();
  const mailer = getMailer();
  const timeZone = process.env.REPORTS_TIME_ZONE || 'Asia/Kolkata';
  let processedCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const [profileSnap, settingsSnap, walletsSnap, categoriesSnap, transactionsSnap] = await Promise.all([
      userDoc.ref.collection('profile').doc('main').get(),
      userDoc.ref.collection('settings').doc('main').get(),
      userDoc.ref.collection('wallets').get(),
      userDoc.ref.collection('categories').get(),
      userDoc.ref.collection('transactions').get(),
    ]);

    const profile = profileSnap.exists ? profileSnap.data() : null;
    const settings = settingsSnap.exists ? settingsSnap.data() : null;
    const wallets = walletsSnap.docs.map((docSnap) => docSnap.data());
    const categories = categoriesSnap.docs.map((docSnap) => docSnap.data());
    const transactions = transactionsSnap.docs.map((docSnap) => docSnap.data());
    const userEmail = profile?.email || userDoc.get('email') || '';
    const userName = profile?.name || userDoc.get('displayName') || 'SpendMap user';
    const monthWindow = getTransactionsForWindow(transactions, timeZone);

    const reportData = buildMonthlyReportData({
      userName,
      monthLabel: monthWindow.monthLabel,
      wallets,
      categories,
      transactions: monthWindow.transactions,
      currency: settings?.currency || profile?.currency || 'INR',
    });

    const pdf = buildMonthlyReportPdfBytes(reportData);
    const xlsx = buildMonthlyReportXlsxBytes(reportData);
    const emailHtml = buildMonthlyReportEmailHtml(reportData);
    const monthKey = monthWindow.monthLabel.toLowerCase().replace(/\s+/g, '-');

    await userDoc.ref.collection('reports').doc(monthKey).set({
      monthLabel: reportData.monthLabel,
      monthKey,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      income: reportData.summary.totalIncome,
      expense: reportData.summary.totalExpense,
      netFlow: reportData.summary.netFlow,
      topCategory: reportData.summary.topCategory,
      topWallet: reportData.summary.topWallet,
      transactionCount: reportData.transactions.length,
      recipientEmail: userEmail || null,
      deliveryStatus: userEmail ? 'queued' : 'generated',
      scheduler: 'github-actions',
      timeZone,
    });

    if (mailer && userEmail) {
      await mailer.sendMail({
        from: process.env.REPORTS_FROM_EMAIL || process.env.REPORTS_GMAIL_USER,
        to: userEmail,
        subject: `Your ${reportData.monthLabel} SpendMap report`,
        html: emailHtml,
        attachments: [
          {
            filename: `${monthKey}-report.pdf`,
            content: Buffer.from(pdf),
            contentType: 'application/pdf',
          },
          {
            filename: `${monthKey}-report.xlsx`,
            content: Buffer.from(xlsx),
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ],
      });

      await userDoc.ref.collection('reports').doc(monthKey).set(
        {
          deliveryStatus: 'sent',
          deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await userDoc.ref.collection('reports').doc(monthKey).set(
        {
          deliveryStatus: 'email-skipped',
        },
        { merge: true }
      );
    }

    processedCount += 1;
    console.log(`Processed report for ${userEmail || userDoc.id}`);
  }

  console.log(`Monthly reports completed for ${processedCount} users.`);
}

if (require.main === module) {
  runMonthlyReports().catch((error) => {
    console.error('Monthly report run failed:', error);
    process.exitCode = 1;
  });
}

module.exports = { runMonthlyReports };
