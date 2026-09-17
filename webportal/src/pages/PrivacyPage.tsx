import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 sm:p-12">
          <Link to="/auth" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <ShieldCheck className="w-10 h-10 text-emerald-600" />
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Global Privacy Policy</h1>
          </div>
          <p className="text-slate-500 mb-8 font-medium border-b pb-8">Last Updated and Effective: September 2026</p>
          
          <div className="prose prose-slate prose-a:text-emerald-600 max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">
            
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 uppercase tracking-wider text-xs">1. Introduction and Scope</h2>
              <p>
                Welcome to Whiz POS ("Company", "we", "our", "us"). We are committed to protecting your personal information and your right to privacy. This Global Privacy Policy governs the data collection, processing, and usage practices of the Whiz POS platform, encompassing all associated web applications, mobile applications, APIs, and cloud services (collectively, the "Services"). 
              </p>
              <p className="mt-2">
                By accessing or using our Services, you entrust us with your business and personal information. We take this responsibility with the utmost seriousness. This document outlines explicitly what data we collect, how it is processed, and the rigorous measures we employ to secure it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 uppercase tracking-wider text-xs">2. Information We Collect</h2>
              <p>
                To provide you with secure and efficient point-of-sale services, we collect information that identifies, relates to, describes, or is reasonably capable of being associated with you or your business.
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li><strong>Identity and Business Data:</strong> First name, last name, business registration name, email addresses, phone numbers, and location details.</li>
                <li><strong>Financial and Transactional Data:</strong> Records of products, inventory metrics, sales logs, receipts, tax configurations, and customer details that you actively input into the platform.</li>
                <li><strong>System and Diagnostic Data:</strong> IP addresses, geographical location data, browser specifications, access timestamps, and interaction analytics. This data is strictly utilized for security monitoring and operational diagnostics.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 uppercase tracking-wider text-xs">3. How We Process and Handle Your Data</h2>
              <p>
                We process your data strictly to fulfill our contractual obligations to you and to operate our business efficiently. We process data via secure, proprietary cloud infrastructure. To protect our systems from cyber reconnaissance, we do not publicly disclose the specific technical architectures, database engines, or backend frameworks utilized in our data processing centers. 
              </p>
              <p className="mt-4 font-bold text-slate-900">Your data is processed for the following purposes:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Service Provisioning:</strong> To create, maintain, and authenticate your tenant workspace, ensuring total isolation of your business data from other platform users.</li>
                <li><strong>Security Operations:</strong> To continuously monitor for fraudulent activity, unauthorized access attempts, and abnormal traffic patterns using automated security algorithms.</li>
                <li><strong>Communication:</strong> To dispatch critical system alerts, transaction receipts, security notices, and administrative broadcasts.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 uppercase tracking-wider text-xs">4. Data Sharing and Disclosure</h2>
              <p>
                Whiz POS operates strictly as a Software-as-a-Service (SaaS) provider. We are not data brokers. We do not sell, rent, trade, or otherwise commercially exploit your personal or business data. Information is only shared under the following strict conditions:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Legal Compliance:</strong> We will disclose data if compelled by a court of law, government request, or regulatory body to comply with legal obligations, particularly concerning anti-money laundering (AML) or fraud investigations.</li>
                <li><strong>Service Execution:</strong> Data may be routed through secured, vetted infrastructure partners solely for the purpose of keeping the platform operational (e.g., automated email dispatch servers).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 uppercase tracking-wider text-xs">5. Security Measures and Protection</h2>
              <p>
                We employ robust, state-of-the-art security measures designed to protect the integrity and confidentiality of your data. This includes end-to-end cryptographic transmission protocols, continuous threat monitoring, and stringent access controls. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure. You are equally responsible for safeguarding your account credentials.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 uppercase tracking-wider text-xs">6. Data Retention Policy</h2>
              <p>
                We retain personal and operational data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law (such as for tax, accounting, or other legal requirements). Upon termination or deletion of your account, your data will be queued for secure, irrecoverable digital wiping from our primary processing centers.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
