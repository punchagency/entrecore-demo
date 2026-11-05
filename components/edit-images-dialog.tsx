import Image from "next/image";
import { Upload, X } from "lucide-react";

import {
  Dialog,
  DialogTitle,
  DialogClose,
  DialogHeader,
  DialogContent,
} from "@/components/ui/dialog";
import eIcon from "@/public/svgs/e-icon.svg";
import eCoverImage from "@/public/svgs/e-cover-image.svg";

const EditImagesDialog = ({
  profileImage,
  coverImage,
  setProfileImage,
  setCoverImage,
  openEditImagesDialog,
  setOpenEditImagesDialog,
}: {
  profileImage: string | null;
  coverImage: string | null;
  setProfileImage: (image: string) => void;
  setCoverImage: (image: string) => void;
  openEditImagesDialog: boolean;
  setOpenEditImagesDialog: (open: boolean) => void;
}) => {
  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCoverImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  return (
    <Dialog open={openEditImagesDialog} onOpenChange={setOpenEditImagesDialog}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Company Profile Images</DialogTitle>
          <DialogClose className="absolute right-4 top-4">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-[#EFF4FF] p-[1vw] rounded-md">
            <h3 className="text-primary font-[600] mb-4">Profile Image</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="profile-image-upload"
                  className="flex items-center gap-2 border border-gray-300 rounded px-4 py-2 bg-white cursor-pointer hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-[0.885vw] font-[600]">Select Image</span>
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageUpload}
                  />
                </label> 
                <div className="text-[0.685vw] text-soft-black border-l border-gray-300 pl-4 ml-2">
                  Min. 400×400px
                  <br />
                  1:1 Aspect Ratio
                </div>
              </div>
              <div className="w-16 h-16 bg-blue-900 rounded overflow-hidden flex items-center justify-center">
                <Image
                  src={profileImage || eIcon}
                  alt="Profile preview"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#EFF4FF] p-[1vw] rounded-md">
            <h3 className="text-primary font-[600] mb-4">Cover Image</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="cover-image-upload"
                  className="flex items-center gap-2 border border-gray-300 rounded px-4 py-2 bg-white cursor-pointer hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-[0.885vw] font-[600]">Select Image</span>
                  <input
                    id="cover-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverImageUpload}
                  />
                </label>
                <div className="text-[0.685vw] text-soft-black border-l border-gray-300 pl-4 ml-2">
                  Min. 1120×480px
                  <br />
                  7:3 Aspect Ratio
                </div>
              </div>
              <div className="w-36 h-16 bg-blue-900 rounded overflow-hidden flex items-center justify-center">
                <Image
                  src={coverImage || eCoverImage}
                  alt="Cover preview"
                  width={128}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditImagesDialog;
