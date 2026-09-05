import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 sm:p-12">
          <Link to="/auth" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Privacy Policy</h1>
          <p className="text-slate-500 mb-8">Last Updated: September 2026</p>
          
          <div className="prose prose-slate prose-a:text-blue-600 max-w-none space-y-6 text-slate-700">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
              <p>
                When you use Whiz POS, we may collect the following types of information:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Account Information:</strong> Name, email address (via direct registration or OAuth providers like Google/Microsoft), business names, and authentication credentials.</li>
                <li><strong>Operational Data:</strong> Inventory, sales, suppliers, and customer data that you input into the system while running your business operations.</li>
                <li><strong>Technical & Security Data:</strong> IP addresses, browser types, request payloads, and login attempts. This data is rigorously analyzed by our Web Application Firewall (WAF) to prevent brute-force attacks and block malicious payloads.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
              <p>
                We use the collected data strictly for the provision and improvement of the Whiz POS services. Specifically:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>To authenticate you and authorize access to your specific business tenant.</li>
                <li>To process transactions, generate reports, and facilitate your daily business operations.</li>
                <li>To maintain system security, detect fraudulent activities, and proactively block cyber threats.</li>
              </ul>
              <p className="mt-2 font-medium">
                Whiz POS does not sell, rent, or unauthorizedly distribute your business data to external third parties. The infrastructure and processing logic used to handle your data is strictly proprietary and originally developed by Whiz POS.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Data Security and Proprietary Protections</h2>
              <p>
                We implement industry-standard security measures, including stringent password policies, automated IP blocking for malicious actors, and JWT-based authentication. 
              </p>
              <p className="mt-2">
                Our security implementations, data architectures, and application logic are 100% proprietary. We do not utilize compromised, copied, or third-party unauthorized codebases to secure your data. Any claims suggesting our security architecture or data handling processes are derived from unauthorized external sources are completely unfounded and legally actionable.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Retention and Deletion</h2>
              <p>
                We retain your data for as long as your account is active or as needed to provide you the Services. You have the right to request the deletion of your personal and business data, subject to certain legal obligations we may have to retain specific records (such as financial transactions).
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Third-Party Services</h2>
              <p>
                Our service integrates with authorized third-party providers (e.g., Google OAuth, Microsoft OAuth) for authentication purposes. While we interact with these providers via secure APIs, we are not responsible for their independent privacy practices.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Changes to this Policy</h2>
              <p>
                We may update this Privacy Policy periodically. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Continued use of the Services after such modifications constitutes your acknowledgment of the modified Privacy Policy.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
