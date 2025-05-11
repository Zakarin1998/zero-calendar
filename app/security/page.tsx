"use client"

import Link from "next/link"
import { ArrowLeftIcon, ShieldIcon, LockIcon, ServerIcon, CodeIcon, BugIcon, AlertTriangleIcon } from "lucide-react"
import { motion } from "framer-motion"

export default function Security() {
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
          <div className="flex items-center gap-3 mb-8">
            <ShieldIcon className="h-8 w-8 text-white" />
            <h1 className="text-4xl font-bold">Security</h1>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-gray-400 text-lg mb-8">
              Zero Calendar is committed to ensuring the security of our users' data. This page outlines our security
              practices and provides information on how to report security vulnerabilities.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="neo-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <LockIcon className="h-5 w-5 text-white" />
                  <h3 className="text-xl font-bold">Data Encryption</h3>
                </div>
                <p className="text-gray-400">
                  All data is encrypted in transit using TLS 1.3. Sensitive data at rest is encrypted using
                  industry-standard AES-256 encryption.
                </p>
              </div>

              <div className="neo-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ServerIcon className="h-5 w-5 text-white" />
                  <h3 className="text-xl font-bold">Infrastructure</h3>
                </div>
                <p className="text-gray-400">
                  Our infrastructure is hosted on secure cloud providers with SOC 2 compliance. We implement network
                  security controls, including firewalls and intrusion detection systems.
                </p>
              </div>

              <div className="neo-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CodeIcon className="h-5 w-5 text-white" />
                  <h3 className="text-xl font-bold">Open Source</h3>
                </div>
                <p className="text-gray-400">
                  As an open-source project, our code is publicly available for review. This transparency allows the
                  community to identify and address security issues quickly.
                </p>
              </div>

              <div className="neo-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BugIcon className="h-5 w-5 text-white" />
                  <h3 className="text-xl font-bold">Bug Bounty</h3>
                </div>
                <p className="text-gray-400">
                  We maintain a bug bounty program to encourage responsible disclosure of security vulnerabilities. See
                  below for details on how to report issues.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Our Security Practices</h2>
            <ul className="list-disc pl-6 mt-2 mb-8 space-y-3">
              <li>
                <strong>Authentication:</strong> We implement secure authentication mechanisms, including support for
                multi-factor authentication and secure password storage using bcrypt hashing.
              </li>
              <li>
                <strong>Regular Audits:</strong> We conduct regular security audits and code reviews to identify and
                address potential vulnerabilities.
              </li>
              <li>
                <strong>Dependency Management:</strong> We regularly update our dependencies to ensure we're protected
                against known vulnerabilities.
              </li>
              <li>
                <strong>Access Controls:</strong> We implement strict access controls to ensure that only authorized
                personnel have access to sensitive systems and data.
              </li>
              <li>
                <strong>Monitoring:</strong> We maintain comprehensive logging and monitoring systems to detect and
                respond to suspicious activities.
              </li>
            </ul>

            <div className="neo-card p-6 border-l-4 border-yellow-500 mb-8">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Reporting Security Issues</h3>
                  <p className="text-gray-400 mb-4">
                    We take security issues seriously. If you believe you've found a security vulnerability in Zero
                    Calendar, please report it to us immediately.
                  </p>
                  <p className="text-gray-400">
                    Send details to{" "}
                    <a href="mailto:security@zerocalendar.com" className="text-white underline">
                      security@zerocalendar.com
                    </a>
                    . We ask that you do not publicly disclose the issue until we've had a chance to address it.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Self-Hosting Security</h2>
            <p>If you're self-hosting Zero Calendar, we recommend following these security best practices:</p>
            <ul className="list-disc pl-6 mt-2 mb-8 space-y-3">
              <li>Keep your server and all dependencies up to date</li>
              <li>Use HTTPS with a valid SSL certificate</li>
              <li>Implement proper firewall rules</li>
              <li>Use strong, unique passwords for all accounts</li>
              <li>Regularly back up your data</li>
              <li>Monitor your server for suspicious activities</li>
              <li>Follow the principle of least privilege for all user accounts</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">Security Updates</h2>
            <p>
              We regularly release security updates to address vulnerabilities. You can stay informed about these
              updates by:
            </p>
            <ul className="list-disc pl-6 mt-2 mb-4 space-y-2">
              <li>Following our GitHub repository</li>
              <li>Subscribing to our security mailing list</li>
              <li>Checking our blog for security announcements</li>
            </ul>

            <div className="mt-12 text-center">
              <p className="text-gray-400 mb-4">Have questions about our security practices?</p>
              <Link
                href="mailto:security@zerocalendar.com"
                className="neo-brutalism-white px-6 py-3 rounded-md font-medium inline-flex items-center justify-center gap-2"
              >
                Contact Our Security Team
              </Link>
            </div>
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
