import { prisma } from '../lib/prisma';
import { ComplianceStatus, ComplianceSummary } from '@ceu/types';
import { ComplianceStatus as PrismaComplianceStatus } from '@prisma/client';

export class ComplianceService {
  async getComplianceForUser(userId: string, year: number): Promise<ComplianceSummary | null> {
    const compliance = await prisma.ceuCompliance.findUnique({
      where: {
        userId_year: {
          userId,
          year,
        },
      },
    });

    if (!compliance) {
      // Create initial compliance record if it doesn't exist
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return null;
      }

      const requiredCredits = user.annualCeuRequirement || 0;
      const newCompliance = await prisma.ceuCompliance.create({
        data: {
          userId,
          year,
          requiredCredits,
          earnedCredits: 0,
          complianceStatus: PrismaComplianceStatus.in_progress,
        },
      });

      return this.mapToComplianceSummary(newCompliance);
    }

    return this.mapToComplianceSummary(compliance);
  }

  async updateCompliance(userId: string, year: number): Promise<ComplianceSummary> {
    // Calculate earned credits from completed courses
    const completedCourses = await prisma.userCeuTracking.findMany({
      where: {
        userId,
        status: 'completed',
        completedDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
      include: {
        course: true,
      },
    });

    const earnedCredits = completedCourses.reduce((sum, tracking) => {
      if (tracking.creditsEarned) {
        return sum + tracking.creditsEarned;
      }
      // Fallback to course credits if tracking doesn't have credits
      if (tracking.course?.credits) {
        const credits = parseFloat(tracking.course.credits.toString());
        return sum + (isNaN(credits) ? 0 : credits);
      }
      return sum;
    }, 0);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const requiredCredits = user?.annualCeuRequirement || 0;

    let complianceStatus: PrismaComplianceStatus;
    if (earnedCredits >= requiredCredits) {
      complianceStatus = PrismaComplianceStatus.compliant;
    } else if (earnedCredits > 0) {
      complianceStatus = PrismaComplianceStatus.in_progress;
    } else {
      complianceStatus = PrismaComplianceStatus.non_compliant;
    }

    const compliance = await prisma.ceuCompliance.upsert({
      where: {
        userId_year: {
          userId,
          year,
        },
      },
      update: {
        earnedCredits,
        complianceStatus,
      },
      create: {
        userId,
        year,
        requiredCredits,
        earnedCredits,
        complianceStatus,
      },
    });

    return this.mapToComplianceSummary(compliance);
  }

  private mapToComplianceSummary(compliance: any): ComplianceSummary {
    const remainingCredits = Math.max(0, compliance.requiredCredits - compliance.earnedCredits);
    const percentageComplete =
      compliance.requiredCredits > 0
        ? Math.min(100, (compliance.earnedCredits / compliance.requiredCredits) * 100)
        : 0;

    return {
      year: compliance.year,
      requiredCredits: compliance.requiredCredits,
      earnedCredits: compliance.earnedCredits,
      remainingCredits,
      complianceStatus: compliance.complianceStatus as ComplianceStatus,
      percentageComplete: Math.round(percentageComplete * 100) / 100,
    };
  }
}

export const complianceService = new ComplianceService();
