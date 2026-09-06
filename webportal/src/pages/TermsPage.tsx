import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 sm:p-12">
          <Link to="/auth" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Terms of Service and End User License Agreement (EULA)</h1>
          <p className="text-slate-500 mb-8">Last Updated: September 2026</p>
          
          <div className="prose prose-slate prose-a:text-blue-600 max-w-none space-y-6 text-slate-700">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing, downloading, installing, or using the Whiz POS platform, services, APIs, and associated web or mobile applications (collectively, the "Services"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Proprietary Rights and Intellectual Property</h2>
              <p>
                You acknowledge and agree that the Services, including but not limited to the codebase, system architecture, database design, algorithms, logic, user interface designs, and all compiled or uncompiled source codes, are the exclusive, proprietary intellectual property of Whiz POS and its original creators.
              </p>
              <p className="mt-2 font-medium">
                We explicitly declare that all knowledge, logic, structure, and content within this platform have been independently developed and architected by Whiz POS. We have not copied, hacked, or utilized third-party proprietary samples, source codes, or restricted knowledge in the creation of our core systems.
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>You may not reverse-engineer, decompile, or disassemble any part of the Services.</li>
                <li>You may not claim ownership or assert any rights over the software architecture or features provided herein.</li>
                <li>You may not reproduce, duplicate, copy, sell, or exploit any portion of the Services without express written permission.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. User Conduct and Responsibilities</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials (including API keys and passwords) and for all activities that occur under your account. You agree not to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Attempt to bypass or break any security mechanism on any of the Services, including our Web Application Firewalls (WAF).</li>
                <li>Transmit any malicious payloads, scripts, or executing code.</li>
                <li>Use the Services for any illegal or unauthorized purpose.</li>
                <li>Make excessive or unreasonable API calls that negatively impact platform stability.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Limitation of Liability and Indemnification</h2>
              <p>
                To the maximum extent permitted by applicable law, in no event shall Whiz POS, its developers, or its affiliates be liable for any indirect, punitive, incidental, special, consequential, or exemplary damages, including without limitation damages for loss of profits, goodwill, use, data, or other intangible losses, that result from the use of, or inability to use, this service.
              </p>
              <p className="mt-2">
                Under no circumstances will Whiz POS be responsible for any damage, loss, or injury resulting from hacking, tampering, or other unauthorized access or use of the service or your account. 
              </p>
              <p className="mt-2 font-semibold">
                You agree to defend, indemnify and hold harmless Whiz POS and its creators from any claims, damages, obligations, or liabilities arising from your violation of these terms or any third-party right, including false claims regarding intellectual property theft.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Service Modifications and Termination</h2>
              <p>
                Whiz POS reserves the right to modify, suspend, or discontinue, temporarily or permanently, the Services (or any part thereof) with or without notice. We reserve the right to terminate your access immediately if we suspect violations of these terms, including automated abuse or security threats.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with applicable federal and regional laws, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
