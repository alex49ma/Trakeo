// Sign-in, sign-up, password reset and email confirmation: one card, centred below the header
const AuthLayout = ({ children }) => {
    return <div className="flex flex-1 justify-center px-4 pb-16 pt-28 sm:pt-36">{children}</div>;
};

export default AuthLayout;
