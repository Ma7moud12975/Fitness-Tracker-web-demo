import * as React from "react";
import { BookUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

/**
 * @typedef {Object} UserProfile
 * @property {string} name
 * @property {string} age
 * @property {string} gender
 * @property {string} weight
 * @property {string} height
 */

export function UserProfileDialog(props) {
  const { open, onOpenChange } = props;
  const { toast } = useToast();
  const [profile, setProfile] = React.useState(() => {
    const saved = localStorage.getItem("userProfile");
    return saved
      ? JSON.parse(saved)
      : {
          name: "",
          age: "",
          gender: "",
          weight: "",
          height: "",
        };
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
    if (window && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("userProfileUpdated", { detail: profile }));
    }
    onOpenChange(false);
    toast({
      title: "Profile Saved",
      description: "Your profile has been updated successfully.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-lg bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 border-2 border-primary">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2 text-primary">User Profile</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right font-semibold text-primary">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              value={profile.name}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-2 border-primary bg-background/80 focus:ring-2 focus:ring-primary"
              required
              placeholder="Enter your name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="age" className="text-right font-semibold text-primary">
              Age
            </Label>
            <Input
              id="age"
              name="age"
              type="number"
              min="1"
              value={profile.age}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-2 border-primary bg-background/80 focus:ring-2 focus:ring-primary"
              required
              placeholder="Enter your age"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="height" className="text-right font-semibold text-primary">
              Height (cm)
            </Label>
            <Input
              id="height"
              name="height"
              type="number"
              min="1"
              value={profile.height}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-2 border-primary bg-background/80 focus:ring-2 focus:ring-primary"
              required
              placeholder="Enter your height"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="weight" className="text-right font-semibold text-primary">
              Weight (kg)
            </Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              min="1"
              value={profile.weight}
              onChange={handleChange}
              className="col-span-3 rounded-lg border-2 border-primary bg-background/80 focus:ring-2 focus:ring-primary"
              required
              placeholder="Enter your weight"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" className="w-full font-semibold bg-primary text-white hover:bg-primary/90 transition-all duration-200 rounded-lg shadow-md">
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
