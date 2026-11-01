// Marks the default account next to its name (account cards and the dashboard's accounts summary)
const DefaultPill = ({ label }) => (
    <span className="text-[11px] font-semibold text-orange-800 bg-orange-100 rounded-full px-2 py-0.5 whitespace-nowrap">
        {label}
    </span>
);

export default DefaultPill
