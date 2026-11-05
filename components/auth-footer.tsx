import Link from "next/link";

const AuthFooter = () => {
  const year = new Date().getFullYear();
  return (
    <div className="position-fixed bottom-0 w-full py-2 mb-8 md:mb-12 ">
      <div className="flex gap-4 w-full justify-center">
        <Link
          href="/terms&conditions"
          className="block text-primary text-center text-sm font-bold mt-4 hover:underline"
        >
          Terms & Conditions
        </Link>
        <Link
          href="/privacy-policy"
          className="block text-primary text-center text-sm font-bold mt-4 hover:underline"
        >
          Privacy Policy
        </Link>
      </div>
      <p className="text-gray text-center text-sm font-medium mt-4">
        © {year} All rights reserved.
      </p>
    </div>
  );
};

export default AuthFooter;
