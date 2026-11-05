const PageHeader = ({ title }: { title: string }) => {
  return (
    <div className="w-full border-b-[1px] border-[#D9DBDD]">
      <div className="flex items-center justify-between bg-[#EFF4FF] w-full py-2">
        <h1 className="text-2xl font-bold capitalize pb-4">{title}</h1>
      </div>
    </div>
  );
};

export default PageHeader;
