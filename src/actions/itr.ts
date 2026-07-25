"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";

export async function getITR(id: string, isSubProfile = false) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "PATIENT") return null;

    if (isSubProfile) {
      // Security Check: Verify the logged-in user owns this sub-profile
      const ownershipCheck = await prisma.subProfile.findUnique({ where: { id } });
      if (!ownershipCheck || ownershipCheck.ownerId !== session.userId) {
        console.error("IDOR Attempt: User tried to access an unowned sub-profile ITR.");
        return null;
      }

      const itr = await prisma.iTR.findUnique({
        where: { subProfileId: id },
        include: { subProfile: true }
      });

      if (!itr) {
        const subProfile = await prisma.subProfile.findUnique({ where: { id } });
        const mappedUser = subProfile ? {
          ...subProfile,
          name: `${subProfile.firstName} ${subProfile.lastName}`,
          phone: "", address: "", maritalStatus: "" 
        } : null;
        return { user: mappedUser, itr: null };
      }

      const sp = itr.subProfile;
      const mappedUser = sp ? {
        ...sp,
        name: `${sp.firstName} ${sp.lastName}`,
        phone: "", address: "", maritalStatus: ""
      } : null;
      return { user: mappedUser, itr };

    } else {
      // Security Check: Verify the logged-in user is requesting their own ID
      if (id !== session.userId) {
        console.error("IDOR Attempt: User tried to access another user's ITR.");
        return null;
      }

      const itr = await prisma.iTR.findUnique({
        where: { patientId: id },
        include: { patient: true }
      });

      if (!itr) {
        const user = await prisma.user.findUnique({ where: { id } });
        return { user, itr: null };
      }

      return { user: itr.patient, itr };
    }
  } catch (error) {
    console.error("Error fetching ITR:", error);
    return null;
  }
}

export async function saveITR(id: string, data: any, isDraft: boolean, isSubProfile = false) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "PATIENT") {
      return { success: false, error: "Unauthorized request." };
    }

    if (isSubProfile) {
      // Security Check: Verify the logged-in user owns this sub-profile
      const ownershipCheck = await prisma.subProfile.findUnique({ where: { id } });
      if (!ownershipCheck || ownershipCheck.ownerId !== session.userId) {
        return { success: false, error: "Unauthorized access to family member record." };
      }
    } else {
      // Security Check: Verify the logged-in user is requesting their own ID
      if (id !== session.userId) {
        return { success: false, error: "Unauthorized access to medical record." };
      }
    }

    const { userFields: rawUserFields, itrFields: rawItrFields } = data;

    // Whitelist: only allow known safe fields to be written
    const ALLOWED_USER_FIELDS = [
      'firstName', 'lastName', 'middleName', 'suffix', 'phone', 'address',
      'birthday', 'maritalStatus', 'gender',
    ];
    const ALLOWED_ITR_FIELDS = [
      'familySerialNumber', 'familyCode', 'bloodType', 'philhealthNumber',
      'memberType', 'clientType',
      'dependentLastName', 'dependentFirstName', 'dependentMiddleName',
      'dependentPin', 'dependentBirthday', 'dependentMaritalStatus', 'dependentSex',
      // Vitals and Complaints removed
      'pastMedicalHistory', 'hospitalizationSpec', 'allergiesSpec', 'pastMedicalOthers',
      'familyHistory', 'familyHistoryOthers',
      'hadSurgery', 'surgeryName', 'surgeryDate',
      'alcohol', 'smoking', 'illicitDrugs', 'sexuallyActive',
      'lastMenstrualPeriod', 'menstrualCycle', 'menstrualRemarks',
      'immunizationNotes',
    ];

    const userFields: Record<string, any> = {};
    if (rawUserFields && typeof rawUserFields === 'object') {
      for (const key of ALLOWED_USER_FIELDS) {
        if (key in rawUserFields) userFields[key] = rawUserFields[key];
      }
    }

    const itrFields: Record<string, any> = {};
    if (rawItrFields && typeof rawItrFields === 'object') {
      for (const key of ALLOWED_ITR_FIELDS) {
        if (key in rawItrFields) itrFields[key] = rawItrFields[key];
      }
    }
    
    // Use transaction to update both User/SubProfile and ITR, and create History
    const result = await prisma.$transaction(async (tx) => {
      
      // Update demographic fields
      if (isSubProfile) {
        // Only update fields that exist on SubProfile
        const spFields: any = {};
        if ('firstName' in userFields) spFields.firstName = userFields.firstName;
        if ('lastName' in userFields) spFields.lastName = userFields.lastName;
        if ('middleName' in userFields) spFields.middleName = userFields.middleName;
        if ('birthday' in userFields) spFields.birthday = userFields.birthday;
        if ('gender' in userFields) spFields.gender = userFields.gender;
        
        await tx.subProfile.update({
          where: { id },
          data: spFields
        });
      } else {
        await tx.user.update({
          where: { id },
          data: userFields
        });
      }

      // Find existing ITR to diff
      const whereClause = isSubProfile ? { subProfileId: id } : { patientId: id };
      const existingITR = await (isSubProfile 
        ? tx.iTR.findUnique({ where: { subProfileId: id } })
        : tx.iTR.findUnique({ where: { patientId: id } }));
      
      let finalITR;
      
      if (existingITR) {
        // Find changed fields for History
        const changedFields: string[] = [];
        const oldValues: any = {};
        const newValues: any = {};
        
        Object.keys(itrFields).forEach(key => {
          const oldVal = existingITR[key as keyof typeof existingITR];
          const newVal = itrFields[key];
          
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changedFields.push(key);
            oldValues[key] = oldVal;
            newValues[key] = newVal;
          }
        });
        
        // If there are changes and we are not just saving a brand new draft without changes, log history
        if (changedFields.length > 0) {
          await tx.iTRHistory.create({
            data: {
              itrId: existingITR.id,
              changedFields,
              oldValues,
              newValues
            }
          });
        }
        
        finalITR = await (isSubProfile 
          ? tx.iTR.update({ where: { subProfileId: id }, data: { ...itrFields, isCompleted: !isDraft } })
          : tx.iTR.update({ where: { patientId: id }, data: { ...itrFields, isCompleted: !isDraft } }));
      } else {
        // Create new ITR
        const createData: any = {
          ...itrFields,
          isCompleted: !isDraft
        };
        if (isSubProfile) {
          createData.subProfileId = id;
        } else {
          createData.patientId = id;
        }

        finalITR = await tx.iTR.create({
          data: createData
        });
      }
      
      return finalITR;
    });

    revalidatePath("/dashboard/patient");
    revalidatePath("/dashboard/patient/itr");
    return { success: true, data: result };
    
  } catch (error: any) {
    console.error("Error saving ITR:", error);
    return { success: false, error: error.message };
  }
}
