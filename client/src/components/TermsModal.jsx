export default function TermsModal({ type, onAgree, onDecline }) {
    const isTerms = type === "terms";
    const title = isTerms ? "Terms of Service" : "Privacy Policy";

    return (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-dark/50 px-4 py-6 backdrop-blur-sm">
            <div className="flex w-full max-w-2xl max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-primary/15">
                <div className="flex shrink-0 items-center justify-between border-b border-primary/10 px-6 py-4">
                    <h2 className="text-lg font-bold text-dark">{title}</h2>
                    <p className="text-xs text-gray">Last updated: June 2026</p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-dark space-y-6">
                    {isTerms ? <TermsContent /> : <PrivacyContent />}
                </div>

                <div className="flex shrink-0 justify-end gap-3 border-t border-primary/10 px-6 py-4">
                    <button
                        type="button"
                        onClick={onAgree}
                        className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
                    >
                        Agree
                    </button>
                </div>
            </div>
        </div>
    );
}

function TermsContent() {
    return (
        <>
            <section>
                <h3 className="font-bold text-dark">1. Introduction</h3>
                <p className="mt-1">Welcome to NP Car Rental (the &quot;Platform&quot;). These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Platform, including any related websites, applications, and services. By creating an account or using the Platform, you agree to be bound by these Terms. If you do not agree, do not use the Platform.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">2. Our Role as a Platform</h3>
                <p className="mt-1">NP Car Rental is a peer-to-peer marketplace that connects vehicle owners (&quot;Hosts&quot;) with individuals seeking to rent vehicles (&quot;Renters&quot;). We act solely as a platform facilitator. We do <strong>not</strong> own, operate, maintain, insure, or control any vehicle listed on the Platform. All rental agreements, bookings, payments, insurance coverage, damages, disputes, and liability arising from a rental are <strong>solely between the Host and the Renter</strong>. NP Car Rental is not a party to any rental contract and bears no responsibility for the conduct, performance, or condition of any Host, Renter, or vehicle.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">3. Eligibility</h3>
                <p className="mt-1">You must be at least 18 years old to use the Platform. Renters must hold a valid driver&#39;s license issued by the Land Transportation Office (LTO) or an equivalent authority. By using the Platform, you represent that all information you provide is accurate, current, and complete.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">4. Account Registration</h3>
                <p className="mt-1">You may be required to create an account and verify your email address. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. The Platform reserves the right to suspend or terminate accounts that violate these Terms.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">5. Host Obligations</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li>You own or have legal authority to rent the vehicle you list.</li>
                    <li>Your vehicle is roadworthy, registered, and meets all applicable LTO requirements.</li>
                    <li>You maintain comprehensive insurance coverage. NP Car Rental does not provide insurance.</li>
                    <li>You are solely responsible for all taxes, fees, and regulatory compliance.</li>
                    <li>You will not discriminate based on race, gender, religion, or any protected characteristic.</li>
                </ul>
            </section>
            <section>
                <h3 className="font-bold text-dark">6. Renter Obligations</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li>You hold a valid LTO driver&#39;s license and will present it at pickup.</li>
                    <li>You will operate the vehicle responsibly and in accordance with all traffic laws.</li>
                    <li>You will return the vehicle on time and in the same condition as received.</li>
                    <li>You are responsible for any traffic violations, fines, or penalties during your rental.</li>
                </ul>
            </section>
            <section>
                <h3 className="font-bold text-dark">7. Booking and Payment</h3>
                <p className="mt-1">Bookings are subject to Host acceptance. Payments are processed through third-party providers. NP Car Rental does not hold funds beyond what is necessary for processing. Platform fees are non-refundable unless stated otherwise.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">8. Platform Fees</h3>
                <p className="mt-1">NP Car Rental charges a platform fee on completed bookings. The current rate is displayed during the booking process. Fees are subject to change with notice. All amounts are in Philippine Pesos (PHP).</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">9. Disclaimers and Limitation of Liability</h3>
                <p className="mt-1"><strong>To the fullest extent permitted by Philippine law:</strong></p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li>The Platform is provided &quot;as is&quot; without warranties of any kind.</li>
                    <li>NP Car Rental disclaims all liability for personal injury, property damage, theft, accidents, or any loss.</li>
                    <li>In no event shall our liability exceed the platform fees you paid in the last 12 months or PHP 5,000, whichever is lower.</li>
                </ul>
            </section>
            <section>
                <h3 className="font-bold text-dark">10. Indemnification</h3>
                <p className="mt-1">You agree to indemnify and hold harmless NP Car Rental from any claims, damages, or expenses arising from your use of the Platform or disputes with other users.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">11. Governing Law</h3>
                <p className="mt-1">These Terms are governed by the laws of the Republic of the Philippines. Any disputes shall be subject to the exclusive jurisdiction of Philippine courts.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">12. Changes to These Terms</h3>
                <p className="mt-1">We may update these Terms. Material changes will be communicated through the Platform or via email. Continued use after changes constitutes acceptance.</p>
            </section>
        </>
    );
}

function PrivacyContent() {
    return (
        <>
            <section>
                <h3 className="font-bold text-dark">1. Introduction</h3>
                <p className="mt-1">NP Car Rental (&quot;we,&quot; &quot;our,&quot; or &quot;the Platform&quot;) respects your privacy. This Privacy Policy explains how we collect, use, store, share, and protect your personal information. By using the Platform, you consent to the practices described.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">2. Information We Collect</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li><strong>Account Information:</strong> Full name, email, contact number, password (hashed).</li>
                    <li><strong>Profile Information:</strong> Profile photo, cover photo, address details.</li>
                    <li><strong>Host Application Data:</strong> Government-issued ID copies, selfie verification photos.</li>
                    <li><strong>Vehicle Information:</strong> Vehicle details, images, and availability.</li>
                    <li><strong>Booking Data:</strong> Dates, times, locations, payment records.</li>
                    <li><strong>Review Data:</strong> Ratings, comments, and feedback you submit.</li>
                    <li><strong>Payment Data:</strong> Processed directly by PayMongo. We do not store card numbers or CVVs.</li>
                    <li><strong>Technical Data:</strong> IP address, browser type, device information.</li>
                </ul>
            </section>
            <section>
                <h3 className="font-bold text-dark">3. How We Use Your Information</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li>Create and manage your account.</li>
                    <li>Facilitate bookings and payments.</li>
                    <li>Verify identity for Host applications.</li>
                    <li>Display reviews and ratings to the community.</li>
                    <li>Send transactional emails (booking confirmations, overdue notices, review requests).</li>
                    <li>Comply with legal obligations and prevent fraud.</li>
                </ul>
            </section>
            <section>
                <h3 className="font-bold text-dark">4. Information Sharing</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li><strong>Between Users:</strong> Name, contact number, booking details shared with the other party.</li>
                    <li><strong>Publicly:</strong> Reviews and ratings are visible to other users.</li>
                    <li><strong>Service Providers:</strong> Google Firebase, Cloudinary, Gmail SMTP, PayMongo.</li>
                    <li><strong>Legal Compliance:</strong> When required by Philippine law.</li>
                </ul>
                <p className="mt-1">We do <strong>not</strong> sell your personal information.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">5. Data Storage and Security</h3>
                <p className="mt-1">Data is stored on Google Firebase (Firestore) with industry-standard encryption. Payment details are handled exclusively by PayMongo. We implement reasonable security measures but cannot guarantee absolute security.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">6. Your Rights (RA 10173 - Data Privacy Act)</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li>Right to be informed, access, rectification, erasure, objection, data portability, and damages.</li>
                </ul>
            </section>
            <section>
                <h3 className="font-bold text-dark">7. Cookies</h3>
                <p className="mt-1">We use strictly necessary session cookies for authentication. We do not use tracking, advertising, or third-party analytics cookies.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">8. Children&#39;s Privacy</h3>
                <p className="mt-1">The Platform is not intended for individuals under 18. We do not knowingly collect data from minors.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">9. Third-Party Services</h3>
                <p className="mt-1">We integrate with Cloudinary, PayMongo, Google Firebase, and Gmail. Each has its own privacy policy. We are not responsible for their practices.</p>
            </section>
            <section>
                <h3 className="font-bold text-dark">10. Contact</h3>
                <p className="mt-1">For privacy-related inquiries or to exercise your rights under the Data Privacy Act, contact us through the Platform.</p>
            </section>
        </>
    );
}
