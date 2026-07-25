"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { differenceInYears, differenceInMonths, format } from "date-fns";
import { toast } from "sonner";
import { Save, FileEdit, CheckCircle2, User, ArrowLeft } from "lucide-react";
import { saveITR } from "@/actions/itr";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function ITRClient({ targetId, isSubProfile, initialData }: { targetId: string; isSubProfile: boolean; initialData: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Destructure data
  const { user, itr } = initialData;
  const isUpdating = !!itr?.isCompleted;

  // Form State - User Demographic Fields
  const [firstName, setFirstName] = useState(user?.firstName || user?.name?.split(' ')[0] || "");
  const [lastName, setLastName] = useState(user?.lastName || user?.name?.split(' ').slice(1).join(' ') || "");
  const [middleName, setMiddleName] = useState(user?.middleName || "");
  const [suffix, setSuffix] = useState(user?.suffix || "");
  const [birthday, setBirthday] = useState(user?.birthday ? new Date(user.birthday).toISOString().split('T')[0] : "");
  const [sex, setSex] = useState(user?.gender || "Male");
  const [maritalStatus, setMaritalStatus] = useState(user?.maritalStatus || "Single");
  const [address, setAddress] = useState(user?.address || "");
  const [contactNumber, setContactNumber] = useState(user?.phone || "");

  // Form State - ITR Fields
  const [familySerialNumber, setFamilySerialNumber] = useState(itr?.familySerialNumber || "");
  const [familyCode, setFamilyCode] = useState(itr?.familyCode || "");
  const [philhealthNumber, setPhilhealthNumber] = useState(itr?.philhealthNumber || "");
  const [memberType, setMemberType] = useState(itr?.memberType || "Member");
  const [clientType, setClientType] = useState<string[]>(itr?.clientType ? (typeof itr.clientType === 'string' ? JSON.parse(itr.clientType) : itr.clientType) : []);

  // Dependent
  const [dependentLastName, setDependentLastName] = useState(itr?.dependentLastName || "");
  const [dependentFirstName, setDependentFirstName] = useState(itr?.dependentFirstName || "");
  const [dependentMiddleName, setDependentMiddleName] = useState(itr?.dependentMiddleName || "");
  const [dependentPin, setDependentPin] = useState(itr?.dependentPin || "");
  const [dependentBirthday, setDependentBirthday] = useState(itr?.dependentBirthday ? new Date(itr.dependentBirthday).toISOString().split('T')[0] : "");
  const [dependentMaritalStatus, setDependentMaritalStatus] = useState(itr?.dependentMaritalStatus || "Single");
  const [dependentSex, setDependentSex] = useState(itr?.dependentSex || "Male");

  // Complaints (Removed from Patient UI, now handled by Triage)

  // Medical History
  const [pastMedicalHistory, setPastMedicalHistory] = useState<string[]>(itr?.pastMedicalHistory ? (typeof itr.pastMedicalHistory === 'string' ? JSON.parse(itr.pastMedicalHistory) : itr.pastMedicalHistory) : []);
  const [hospitalizationSpec, setHospitalizationSpec] = useState(itr?.hospitalizationSpec || "");
  const [allergiesSpec, setAllergiesSpec] = useState(itr?.allergiesSpec || "");
  const [pastMedicalOthers, setPastMedicalOthers] = useState(itr?.pastMedicalOthers || "");

  // Family History
  const [familyHistory, setFamilyHistory] = useState<string[]>(itr?.familyHistory ? (typeof itr.familyHistory === 'string' ? JSON.parse(itr.familyHistory) : itr.familyHistory) : []);
  const [familyHistoryOthers, setFamilyHistoryOthers] = useState(itr?.familyHistoryOthers || "");

  // Surgical History
  const [hadSurgery, setHadSurgery] = useState(itr?.hadSurgery ? "Yes" : "No");
  const [surgeryName, setSurgeryName] = useState(itr?.surgeryName || "");
  const [surgeryDate, setSurgeryDate] = useState(itr?.surgeryDate ? new Date(itr.surgeryDate).toISOString().split('T')[0] : "");

  // Social
  const [alcohol, setAlcohol] = useState(itr?.alcohol ? "Yes" : "No");
  const [smoking, setSmoking] = useState(itr?.smoking ? "Yes" : "No");
  const [illicitDrugs, setIllicitDrugs] = useState(itr?.illicitDrugs ? "Yes" : "No");
  const [sexuallyActive, setSexuallyActive] = useState(itr?.sexuallyActive ? "Yes" : "No");

  // OB-Gyne
  const [lastMenstrualPeriod, setLastMenstrualPeriod] = useState(itr?.lastMenstrualPeriod ? new Date(itr.lastMenstrualPeriod).toISOString().split('T')[0] : "");
  const [menstrualCycle, setMenstrualCycle] = useState(itr?.menstrualCycle || "Regular");
  const [menstrualRemarks, setMenstrualRemarks] = useState(itr?.menstrualRemarks || "");

  // Immunization
  const [immunizationNotes, setImmunizationNotes] = useState(itr?.immunizationNotes || "");

  // Validation state
  const [errors, setErrors] = useState<{address?: string; contactNumber?: string}>({});

  // Computed Values
  const [age, setAge] = useState(0);
  const [isTwoOrBelow, setIsTwoOrBelow] = useState(false);

  useEffect(() => {
    if (birthday) {
      const bdayDate = new Date(birthday);
      const years = differenceInYears(new Date(), bdayDate);
      setAge(years);
      setIsTwoOrBelow(years <= 2);
    }
  }, [birthday]);

  // Collapsible Sections State
  const [sectionsOpen, setSectionsOpen] = useState({
    sec1: true, sec2: true, sec3: true, sec4: true,
    sec5: true, sec6: true, sec7: true, sec8: true,
    sec9: true, sec10: true
  });

  const toggleSection = (sec: string) => {
    setSectionsOpen(prev => ({ ...prev, [sec]: !prev[sec as keyof typeof prev] }));
  };

  const handleCheckboxArray = (value: string, currentArray: string[], setter: any) => {
    if (currentArray.includes(value)) {
      setter(currentArray.filter(v => v !== value));
    } else {
      if (value === "None") {
        setter(["None"]);
      } else {
        setter([...currentArray.filter(v => v !== "None"), value]);
      }
    }
  };

  const validateForm = () => {
    const newErrors: any = {};
    if (!address.trim()) newErrors.address = "Address is required";
    if (!contactNumber.trim()) newErrors.contactNumber = "Contact Number is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (isDraft: boolean) => {
    if (!isDraft && !validateForm()) {
      toast.error("Please fill in all required fields.");
      // Auto open section 1 if error
      setSectionsOpen(prev => ({ ...prev, sec1: true }));
      return;
    }

    setLoading(true);

    const data = {
      userFields: {
        firstName, lastName, middleName, suffix,
        birthday: birthday ? new Date(birthday) : null,
        gender: sex,
        maritalStatus,
        address,
        phone: contactNumber,
        name: `${firstName} ${lastName}`.trim()
      },
      itrFields: {
        familySerialNumber, familyCode, philhealthNumber, memberType,
        clientType: JSON.stringify(clientType),
        
        dependentLastName, dependentFirstName, dependentMiddleName, dependentPin,
        dependentBirthday: dependentBirthday ? new Date(dependentBirthday) : null,
        dependentMaritalStatus, dependentSex,

        // Vitals and Complaints are now recorded by staff during triage

        pastMedicalHistory: JSON.stringify(pastMedicalHistory),
        hospitalizationSpec, allergiesSpec, pastMedicalOthers,

        familyHistory: JSON.stringify(familyHistory),
        familyHistoryOthers,

        hadSurgery: hadSurgery === "Yes",
        surgeryName,
        surgeryDate: surgeryDate ? new Date(surgeryDate) : null,

        alcohol: alcohol === "Yes",
        smoking: smoking === "Yes",
        illicitDrugs: illicitDrugs === "Yes",
        sexuallyActive: sexuallyActive === "Yes",

        lastMenstrualPeriod: lastMenstrualPeriod ? new Date(lastMenstrualPeriod) : null,
        menstrualCycle, menstrualRemarks,
        immunizationNotes
      }
    };

    setLoading(true);
    const res = await saveITR(targetId, data, isDraft, isSubProfile);
    setLoading(false);

    if (res?.success) {
      if (isDraft) {
        toast.success("Draft saved!");
      } else {
        toast.success(isUpdating ? "Health record updated successfully!" : "Health record saved successfully!");
        router.push("/dashboard/patient");
      }
    } else {
      toast.error(res?.error || "An error occurred while saving.");
    }
  };

  // UI Components for Form
  const EditableTag = () => isUpdating ? <Badge className="bg-emerald-100 text-emerald-800 ml-2 border-0 pointer-events-none px-1.5 py-0">Editable</Badge> : null;
  const ReadOnlyTag = () => <Badge variant="outline" className="text-slate-400 border-slate-200 ml-2 pointer-events-none px-1.5 py-0">Read Only</Badge>;

  return (
    <div className="max-w-5xl mx-auto pb-32">
      {/* ── Back Button ── */}
      <div className="mb-4">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* HEADER */}
      <div className="bg-white p-6 rounded-t-2xl border-b-4 border-emerald-600 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-4">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shrink-0 overflow-hidden">
             <Image src="/rhu1.png" alt="RHU Logo" width={96} height={96} className="w-full h-full object-contain scale-110" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 uppercase">Individual Treatment Record</h1>
            <p className="text-slate-500 font-medium">Agoo Municipal Health Office Primary Care Facility</p>
          </div>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 font-mono text-xs">ITR rev3 - 2026</Badge>
          <p className="text-sm text-slate-500 mt-2 font-mono" suppressHydrationWarning>{format(new Date(), "PPpp")}</p>
        </div>
      </div>

      {/* ── Who is this record for? Banner ── */}
      <div className={cn(
        "mb-6 p-4 rounded-xl border-2 flex items-center gap-4",
        isSubProfile ? "bg-amber-50 border-amber-200" : "bg-sky-50 border-sky-200"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2",
          isSubProfile ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-sky-100 text-sky-700 border-sky-200"
        )}>
          <User className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
            {isUpdating ? "Editing Record For" : "Creating Record For"}
          </p>
          <div className="flex items-center gap-2">
            <h2 className={cn(
              "text-xl font-bold tracking-tight",
              isSubProfile ? "text-amber-950" : "text-sky-950"
            )}>
              {firstName} {lastName}
            </h2>
            <Badge variant="outline" className={cn(
              "border",
              isSubProfile ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-sky-100 text-sky-800 border-sky-300"
            )}>
              {isSubProfile ? "Family Member" : "Myself"}
            </Badge>
          </div>
        </div>
      </div>

      <p className="text-slate-500 mt-2 mb-6">
        {isSubProfile ? "Manage the health record for your family member." : "Please provide your complete medical history and current health information. This helps our healthcare providers give you the best possible care."}
      </p>

      <div className="space-y-6">
        
        {/* SECTION 1 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center cursor-pointer text-white" onClick={() => toggleSection('sec1')}>
            <h2 className="font-bold text-lg">1. Basic Information</h2>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              {sectionsOpen.sec1 ? <span className="text-white text-xs">▼</span> : <span className="text-white text-xs">▲</span>}
            </div>
          </div>
          {sectionsOpen.sec1 && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="space-y-2 lg:col-span-2">
                <Label>Family Serial Number</Label>
                <Input value={familySerialNumber} onChange={e => setFamilySerialNumber(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Family Code</Label>
                <Input value={familyCode} onChange={e => setFamilyCode(e.target.value)} placeholder="Optional" />
              </div>

              {/* Editable Registration Fields */}
              <div className="space-y-2">
                <Label className="flex items-center">Last Name <EditableTag/></Label>
                <Input value={lastName} onChange={(e)=>setLastName(e.target.value)}/>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center">First Name <EditableTag/></Label>
                <Input value={firstName} onChange={(e)=>setFirstName(e.target.value)}/>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center">Middle Name <EditableTag/></Label>
                <Input value={middleName} onChange={(e)=>setMiddleName(e.target.value)}/>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center">Suffix <EditableTag/></Label>
                <Input value={suffix} onChange={(e)=>setSuffix(e.target.value)} placeholder="e.g. Jr., Sr."/>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center">Birthday <EditableTag/></Label>
                <Input type="date" value={birthday} onChange={(e)=>setBirthday(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center">Age</Label>
                <Input value={age} readOnly className="bg-slate-50 text-emerald-700 font-bold cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center">Sex <EditableTag/></Label>
                <select value={sex} onChange={(e)=>setSex(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center">Marital Status <EditableTag/></Label>
                <select value={maritalStatus} onChange={(e)=>setMaritalStatus(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
                  <option value="">Select...</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                </select>
              </div>

              {/* Updatable Fields */}
              <div className="space-y-2 lg:col-span-3">
                <Label className="flex items-center">Address <span className="text-red-500 ml-1">*</span> <EditableTag/></Label>
                <Textarea value={address} onChange={e => setAddress(e.target.value)} className={errors.address ? "border-red-500 focus-visible:ring-red-500" : ""} />
                {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center">Contact Number <span className="text-red-500 ml-1">*</span> <EditableTag/></Label>
                <Input value={contactNumber} onChange={e => setContactNumber(e.target.value)} className={errors.contactNumber ? "border-red-500 focus-visible:ring-red-500" : ""} />
                {errors.contactNumber && <p className="text-xs text-red-500">{errors.contactNumber}</p>}
              </div>

              {/* Philhealth */}
              <div className="space-y-2 lg:col-span-2">
                <Label>Philhealth Number</Label>
                <Input value={philhealthNumber} onChange={e => setPhilhealthNumber(e.target.value)} placeholder="00-000000000-0" />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Member Type</Label>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="memberType" value="Member" checked={memberType === "Member"} onChange={() => setMemberType("Member")} className="w-4 h-4 accent-emerald-600" />
                    Member
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="memberType" value="Dependent" checked={memberType === "Dependent"} onChange={() => setMemberType("Dependent")} className="w-4 h-4 accent-emerald-600" />
                    Dependent
                  </label>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* SECTION 2 (Conditional) */}
        {memberType === "Dependent" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-l-4 border-l-blue-500">
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-800 text-lg">2. Philhealth Dependent Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2"><Label>Member's Last Name</Label><Input value={dependentLastName} onChange={e => setDependentLastName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Member's First Name</Label><Input value={dependentFirstName} onChange={e => setDependentFirstName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Member's Middle Name</Label><Input value={dependentMiddleName} onChange={e => setDependentMiddleName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Member's PIN</Label><Input value={dependentPin} onChange={e => setDependentPin(e.target.value)} /></div>
              <div className="space-y-2"><Label>Member's Birthday</Label><Input type="date" value={dependentBirthday} onChange={e => setDependentBirthday(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Member's Sex</Label>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2"><input type="radio" name="depSex" value="Male" checked={dependentSex==="Male"} onChange={()=>setDependentSex("Male")} className="accent-emerald-600"/> Male</label>
                  <label className="flex items-center gap-2"><input type="radio" name="depSex" value="Female" checked={dependentSex==="Female"} onChange={()=>setDependentSex("Female")} className="accent-emerald-600"/> Female</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Past Medical History (Previously Sec 5) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center cursor-pointer text-white" onClick={() => toggleSection('sec5')}>
            <h2 className="font-bold text-lg">3. Past Medical History</h2>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              {sectionsOpen.sec5 ? <span className="text-white text-xs">▼</span> : <span className="text-white text-xs">▲</span>}
            </div>
          </div>
          {sectionsOpen.sec5 && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
               {["Asthma", "G6PD", "Diabetes Mellitus", "Hypertension", "Chronic Kidney Disease", "Heart Disease"].map(pmh => (
                  <label key={pmh} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                    <input type="checkbox" checked={pastMedicalHistory.includes(pmh)} onChange={() => handleCheckboxArray(pmh, pastMedicalHistory, setPastMedicalHistory)} className="w-4 h-4 accent-emerald-600 rounded" />
                    <span>{pmh}</span>
                  </label>
               ))}
               <div className="space-y-2 md:col-span-2">
                 <label className="flex items-center gap-3 cursor-pointer p-2">
                    <input type="checkbox" checked={pastMedicalHistory.includes("Hospitalization")} onChange={() => handleCheckboxArray("Hospitalization", pastMedicalHistory, setPastMedicalHistory)} className="w-4 h-4 accent-emerald-600 rounded" />
                    <span>Hospitalization</span>
                 </label>
                 {pastMedicalHistory.includes("Hospitalization") && <Input value={hospitalizationSpec} onChange={e=>setHospitalizationSpec(e.target.value)} placeholder="Specify illness and year" />}
               </div>
               <div className="space-y-2 md:col-span-2">
                 <label className="flex items-center gap-3 cursor-pointer p-2">
                    <input type="checkbox" checked={pastMedicalHistory.includes("Allergies")} onChange={() => handleCheckboxArray("Allergies", pastMedicalHistory, setPastMedicalHistory)} className="w-4 h-4 accent-emerald-600 rounded" />
                    <span>Allergies</span>
                 </label>
                 {pastMedicalHistory.includes("Allergies") && <Input value={allergiesSpec} onChange={e=>setAllergiesSpec(e.target.value)} placeholder="Specify allergies" />}
               </div>
               <div className="space-y-2 md:col-span-2">
                 <label className="flex items-center gap-3 cursor-pointer p-2">
                    <input type="checkbox" checked={pastMedicalHistory.includes("Others")} onChange={() => handleCheckboxArray("Others", pastMedicalHistory, setPastMedicalHistory)} className="w-4 h-4 accent-emerald-600 rounded" />
                    <span>Others</span>
                 </label>
                 {pastMedicalHistory.includes("Others") && <Input value={pastMedicalOthers} onChange={e=>setPastMedicalOthers(e.target.value)} placeholder="Specify other history" />}
               </div>
               <label className="flex items-center gap-3 cursor-pointer p-2 md:col-span-2 text-slate-500 bg-slate-50 rounded mt-2">
                  <input type="checkbox" checked={pastMedicalHistory.includes("None")} onChange={() => handleCheckboxArray("None", pastMedicalHistory, setPastMedicalHistory)} className="w-4 h-4 accent-emerald-600 rounded" />
                  <span>None</span>
               </label>
            </div>
          )}
        </div>

        {/* SEC 6, 7, 8 in Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* SECTION 4: Family History (Previously Sec 6) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center cursor-pointer text-white" onClick={() => toggleSection('sec6')}>
              <h2 className="font-bold text-lg">4. Family History</h2>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                {sectionsOpen.sec6 ? <span className="text-white text-xs">▼</span> : <span className="text-white text-xs">▲</span>}
              </div>
            </div>
            {sectionsOpen.sec6 && (
              <div className="p-6 space-y-3">
                 {["Diabetes Mellitus", "Hypertension", "Chronic Kidney Disease", "Heart Disease", "COPD", "Cancer"].map(fh => (
                    <label key={fh} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={familyHistory.includes(fh)} onChange={() => handleCheckboxArray(fh, familyHistory, setFamilyHistory)} className="w-4 h-4 accent-emerald-600 rounded" />
                      <span>{fh}</span>
                    </label>
                 ))}
                 <label className="flex items-center gap-3 cursor-pointer pt-2">
                    <input type="checkbox" checked={familyHistory.includes("Others")} onChange={() => handleCheckboxArray("Others", familyHistory, setFamilyHistory)} className="w-4 h-4 accent-emerald-600 rounded" />
                    <span>Others</span>
                 </label>
                 {familyHistory.includes("Others") && <Input value={familyHistoryOthers} onChange={e=>setFamilyHistoryOthers(e.target.value)} placeholder="Specify" className="mt-2" />}
                 <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer text-slate-500 bg-slate-50 p-2 rounded">
                      <input type="checkbox" checked={familyHistory.includes("None")} onChange={() => handleCheckboxArray("None", familyHistory, setFamilyHistory)} className="w-4 h-4 accent-emerald-600 rounded" />
                      <span>None</span>
                    </label>
                 </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* SECTION 5: Surgical History (Previously Sec 7) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center cursor-pointer text-white" onClick={() => toggleSection('sec7')}>
                <h2 className="font-bold text-lg">5. Surgical History</h2>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  {sectionsOpen.sec7 ? <span className="text-white text-xs">▼</span> : <span className="text-white text-xs">▲</span>}
                </div>
              </div>
              {sectionsOpen.sec7 && (
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Had Surgery?</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2"><input type="radio" name="surg" value="No" checked={hadSurgery==="No"} onChange={()=>setHadSurgery("No")} className="accent-emerald-600"/> No</label>
                      <label className="flex items-center gap-2"><input type="radio" name="surg" value="Yes" checked={hadSurgery==="Yes"} onChange={()=>setHadSurgery("Yes")} className="accent-emerald-600"/> Yes</label>
                    </div>
                  </div>
                  {hadSurgery === "Yes" && (
                    <>
                      <div className="space-y-2"><Label>Name of Surgical Operation</Label><Input value={surgeryName} onChange={e=>setSurgeryName(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Date of Operation</Label><Input type="date" value={surgeryDate} onChange={e=>setSurgeryDate(e.target.value)} /></div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 6: Personal Social History (Previously Sec 8) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center cursor-pointer text-white" onClick={() => toggleSection('sec8')}>
                <h2 className="font-bold text-lg">6. Personal Social History</h2>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  {sectionsOpen.sec8 ? <span className="text-white text-xs">▼</span> : <span className="text-white text-xs">▲</span>}
                </div>
              </div>
              {sectionsOpen.sec8 && (
                <div className="p-6 grid grid-cols-2 gap-4">
                  {[ 
                    {l: "Alcohol", v: alcohol, set: setAlcohol}, 
                    {l: "Smoking", v: smoking, set: setSmoking}, 
                    {l: "Illicit Drugs", v: illicitDrugs, set: setIllicitDrugs}, 
                    {l: "Sexually Active", v: sexuallyActive, set: setSexuallyActive} 
                  ].map(item => (
                    <div key={item.l} className="space-y-2">
                      <Label>{item.l}</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2"><input type="radio" name={item.l} value="No" checked={item.v==="No"} onChange={()=>item.set("No")} className="accent-emerald-600"/> No</label>
                        <label className="flex items-center gap-2"><input type="radio" name={item.l} value="Yes" checked={item.v==="Yes"} onChange={()=>item.set("Yes")} className="accent-emerald-600"/> Yes</label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 7: OB-Gyne History (Previously Sec 9, Conditional) */}
        {sex === "Female" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-l-4 border-l-pink-500">
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-800 text-lg">7. OB-Gyne History</h2>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-6">
              <div className="space-y-2"><Label>Last Menstrual Period</Label><Input type="date" value={lastMenstrualPeriod} onChange={e=>setLastMenstrualPeriod(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Menstrual Cycle</Label>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2"><input type="radio" name="mens" value="Regular" checked={menstrualCycle==="Regular"} onChange={()=>setMenstrualCycle("Regular")} className="accent-emerald-600"/> Regular</label>
                  <label className="flex items-center gap-2"><input type="radio" name="mens" value="Irregular" checked={menstrualCycle==="Irregular"} onChange={()=>setMenstrualCycle("Irregular")} className="accent-emerald-600"/> Irregular</label>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2"><Label>Remarks</Label><Textarea value={menstrualRemarks} onChange={e=>setMenstrualRemarks(e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* SECTION 8: Immunization (Previously Sec 10) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center cursor-pointer text-white" onClick={() => toggleSection('sec10')}>
            <h2 className="font-bold text-lg">8. Immunization</h2>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              {sectionsOpen.sec10 ? <span className="text-white text-xs">▼</span> : <span className="text-white text-xs">▲</span>}
            </div>
          </div>
          {sectionsOpen.sec10 && (
            <div className="p-6">
              <div className="space-y-2">
                <Label>Immunization History Notes (Optional)</Label>
                <Textarea value={immunizationNotes} onChange={e=>setImmunizationNotes(e.target.value)} placeholder="Specify vaccines received..." className="min-h-[100px]" />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-40 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="w-full sm:w-auto text-center sm:text-left">
            <p className="text-sm font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {isUpdating ? "Updating Health Record" : "New Health Record"}
            </p>
            <p className="text-xs text-slate-500">Please review your entries before saving.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => handleSave(true)} 
              disabled={loading} 
              className="flex-1 sm:flex-initial text-xs sm:text-sm px-3 sm:px-4"
            >
              Save as Draft
            </Button>
            <Button 
              onClick={() => handleSave(false)} 
              disabled={loading} 
              className="flex-1 sm:flex-initial text-xs sm:text-sm px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" />
              {isUpdating ? "Update Record" : "Save Record"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


