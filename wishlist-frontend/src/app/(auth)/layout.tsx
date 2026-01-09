export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
        }}>
            <div style={{
                width: "100%",
                maxWidth: "400px",
                display: "flex",
                flexDirection: "column",
                gap: "2rem"
            }}>
                {children}
            </div>
        </div>
    );
}
