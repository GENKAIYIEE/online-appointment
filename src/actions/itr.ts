"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getITR(patientId: string) {
  try {
    const itr = await prisma.iTR.findUnique({
      where: { patientId },
      include: {
        patient: true
      }
    });
    
    // If no ITR exists, return just the user basic info from User table
    if (!itr) {
      const user = await prisma.user.findUnique({
        where: { id: patientId }
      });
      return { user, itr: null };
    }
    
    return { user: itr.patient, itr };
  } catch (error) {
    console.error("Error fetching ITR:", error);
    return null;
  }
}

export async function saveITR(patientId: string, data: any, isDraft: boolean) {
  try {
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
      'bloodPressure', 'temperature', 'heartRate', 'respiratoryRate', 'o2Sat',
      'heightCm', 'weightKg', 'lengthCm', 'weightKg2yo', 'muac',
      'chiefComplaints', 'otherComplaints', 'medicationsTaken', 'medicationsSpec',
      'prescriptionRefill', 'prescriptionSpec',
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
    
    // Use transaction to update both User and ITR, and create History
    const result = await prisma.$transaction(async (tx) => {
      
      // Update User table demographic fields
      await tx.user.update({
        where: { id: patientId },
        data: userFields
      });

      // Find existing ITR to diff
      const existingITR = await tx.iTR.findUnique({ where: { patientId } });
      
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
        
        finalITR = await tx.iTR.update({
          where: { patientId },
          data: {
            ...itrFields,
            isCompleted: !isDraft
          }
        });
      } else {
        // Create new ITR
        finalITR = await tx.iTR.create({
          data: {
            patientId,
            ...itrFields,
            isCompleted: !isDraft
          }
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
