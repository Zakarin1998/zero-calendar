"use client"

import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { motion } from "framer-motion"

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Decorative background elements */}
      <div className="fixed inset-0 noise-filter pointer-events-none opacity-20"></div>

      {/* Header */}
      <header className="py-6 relative z-10 border-b border-white/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Back to home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.main
        className="flex-1 py-12 md:py-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

          <div className="prose prose-invert max-w-none">
            <p className="text-gray-400 text-lg mb-8">Last updated: May 11, 2025</p>

            <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Zero Calendar ("the Service"), you agree to be bound by these Terms of Service
              ("Terms"). If you disagree with any part of the terms, you may not access the Service.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">2. Description of Service</h2>
            <p>
              Zero Calendar is an open-source AI-powered calendar application that allows users to manage their
              schedules, create events, and integrate with third-party calendar services.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">3. User Accounts</h2>
            <p>
              When you create an account with us, you must provide accurate, complete, and current information. You are
              responsible for safeguarding the password and for all activities that occur under your account.
            </p>
            <p>
              You agree not to disclose your password to any third party. You must notify us immediately upon becoming
              aware of any breach of security or unauthorized use of your account.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. Open Source License</h2>
            <p>
              Zero Calendar is released under the MIT License. This means you are free to use, copy, modify, merge,
              publish, distribute, sublicense, and/or sell copies of the software, subject to the conditions of the MIT
              License.
            </p>
            <p>The full text of the MIT License can be found in the LICENSE file in our GitHub repository.</p>

            <h2 className="text-2xl font-bold mt-8 mb-4">5. User Content</h2>
            <p>
              Our Service allows you to post, link, store, share and otherwise make available certain information, text,
              graphics, or other material ("Content"). You are responsible for the Content that you post on or through
              the Service, including its legality, reliability, and appropriateness.
            </p>
            <p>
              By posting Content on or through the Service, you represent and warrant that: (i) the Content is yours
              and/or you have the right to use it and the right to grant us the rights and license as provided in these
              Terms, and (ii) that the posting of your Content on or through the Service does not violate the privacy
              rights, publicity rights, copyrights, contract rights or any other rights of any person or entity.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">6. Intellectual Property</h2>
            <p>
              The Service and its original content (excluding Content provided by users), features, and functionality
              are and will remain the exclusive property of Zero Calendar and its licensors. The Service is protected by
              copyright, trademark, and other laws of both the United States and foreign countries.
            </p>
            <p>
              Our trademarks and trade dress may not be used in connection with any product or service without the prior
              written consent of Zero Calendar.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">7. Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice
              or liability, under our sole discretion, for any reason whatsoever and without limitation, including but
              not limited to a breach of the Terms.
            </p>
            <p>
              If you wish to terminate your account, you may simply discontinue using the Service, or delete your
              account through the account settings.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">8. Limitation of Liability</h2>
            <p>
              In no event shall Zero Calendar, nor its directors, employees, partners, agents, suppliers, or affiliates,
              be liable for any indirect, incidental, special, consequential or punitive damages, including without
              limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your
              access to or use of or inability to access or use the Service; (ii) any conduct or content of any third
              party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or
              alteration of your transmissions or content, whether based on warranty, contract, tort (including
              negligence) or any other legal theory, whether or not we have been informed of the possibility of such
              damage.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">9. Disclaimer</h2>
            <p>
              Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE"
              basis. The Service is provided without warranties of any kind, whether express or implied, including, but
              not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement
              or course of performance.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">10. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of the United States, without
              regard to its conflict of law provisions.
            </p>
            <p>
              Our failure to enforce any right or provision of these Terms will not be considered a waiver of those
              rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining
              provisions of these Terms will remain in effect.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">11. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will
              provide notice of any changes by posting the new Terms on this page.
            </p>
            <p>
              You are advised to review these Terms periodically for any changes. Changes to these Terms are effective
              when they are posted on this page.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">12. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p className="mt-2">
              <a href="mailto:legal@zerocalendar.com" className="text-white underline">
                legal@zerocalendar.com
              </a>
            </p>
          </div>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 relative z-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Zero Calendar. Open Source under MIT License.
          </div>
        </div>
      </footer>
    </div>
  )
}
