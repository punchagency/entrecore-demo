"use client";
import { Button } from "@/components/ui/button";

const AccountSettingsLayout = ({ children }: { children: React.ReactNode }) => {
  const scrollToSection = (sectionId: string) => {
    // Adding an offset so the sticky header doesn't cover the section title
    const section = document.getElementById(sectionId);
    if (section) {
      const y = section.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <>
      <style>{`
        .account-page {
          min-height: 100vh;
          background: #EFF4FF;
          padding-bottom: 3rem;
        }

        .account-topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: rgba(239, 244, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(99, 102, 241, 0.12);
        }
        .account-topbar-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e1b4b;
          letter-spacing: -0.3px;
        }

        .account-layout {
          max-width: 1000px; /* matched my profile */
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          padding: 2.5rem 2rem 0;
          gap: 2rem;
        }

        @media (min-width: 1024px) {
          .account-layout {
            flex-direction: row;
            align-items: flex-start;
          }
        }

        .account-sidebar {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: sticky;
          top: 6rem;
        }
        @media (min-width: 1024px) {
          .account-sidebar {
            width: 260px;
            flex-shrink: 0;
          }
        }
        
        .account-sidebar-btn {
          justify-content: flex-start;
          padding: 0.75rem 1rem;
          font-weight: 600;
          color: #4b5563;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          transition: all 0.2s ease;
        }
        .account-sidebar-btn:hover {
          background: rgba(99, 102, 241, 0.05);
          color: #4f46e5;
        }

        .account-content {
          flex: 1;
          width: 100%;
        }

        /* ── Reused Shared Card Styles ── */
        .account-section-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 16px rgba(99, 102, 241, 0.07), 0 1px 4px rgba(0,0,0,0.03);
          border: 1px solid rgba(99, 102, 241, 0.09);
        }
        .account-section-header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 1.25rem 2rem;
          border-bottom: 1px solid #f3f4f6;
          background: linear-gradient(to right, #fafafe, #fff);
        }
        .account-section-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4f46e5;
          flex-shrink: 0;
        }
        .account-section-title {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #1e1b4b;
          margin: 0;
        }
        .account-section-desc {
          font-size: 0.8125rem;
          color: #9ca3af;
          margin: 0.1rem 0 0;
        }
        .account-section-body {
          padding: 1.75rem 2rem;
        }

        .account-field-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.45rem;
        }

        .account-input {
          border-radius: 10px !important;
          border-color: #e5e7eb !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
        }
        .account-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
          outline: none !important;
        }

        .account-save-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 1.25rem;
          height: 44px;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        }
        .account-save-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
        }
        .account-save-btn:active {
          transform: translateY(0);
        }
      `}</style>
      <div className="account-page">
        <div className="account-topbar">
          <span className="account-topbar-title">Account Settings</span>
        </div>

        <div className="account-layout">
          <div className="account-sidebar">
            <Button
              variant="ghost"
              className="account-sidebar-btn"
              onClick={() => scrollToSection("login-signup")}
            >
              Login & Signup
            </Button>
            <Button
              variant="ghost"
              className="account-sidebar-btn"
              onClick={() => scrollToSection("additional-settings")}
            >
              Additional Settings
            </Button>
          </div>

          <div className="account-content">{children}</div>
        </div>
      </div>
    </>
  );
};
export default AccountSettingsLayout;
