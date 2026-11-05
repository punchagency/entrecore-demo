    const SearchResultType = () => {
        return (
            <div className="flex flex-col gap-2 w-full xl:w-72 ">
                <div className="bg-white rounded-full px-4 py-2">
                    <p className="text-lg font-bold text-soft-black">Company Profile</p>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                <div className="flex justify-between">
                    <p className="font-medium text-sm">Fundraising Status</p>
                    <p className="text-[#3064F6] text-sm font-medium">Fundraising</p>
                </div>
                <div className="flex justify-between">
                    <p className="font-medium text-sm">Revenue Status</p>
                    <p className="text-[#3064F6] text-sm font-medium">Pre-Revenue</p>
                </div>
                <div className="flex justify-between">
                    <p className="font-medium text-sm">Company Size</p>
                    <p className="text-[#3064F6] text-sm font-medium">0-10 Employees</p>
                </div>
                <div className="flex justify-between">
                    <p className="font-medium text-sm">Product Type</p>
                    <p className="text-[#3064F6] text-sm font-medium">Software</p>
                </div>
                <div className="flex justify-between">
                    <p className="font-medium text-sm">Product Stage</p>
                    <p className="text-[#3064F6] text-sm font-medium">Launched</p>
                </div>                
                </div>
            </div>
        )
    }

    export default SearchResultType;
