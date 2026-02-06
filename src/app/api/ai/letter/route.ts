export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { checkRateLimit, incrementUsage, getUserTier } from '@/lib/ai/rate-limiter';
import { callOpenRouter } from '@/lib/ai/openrouter';
import { LetterType, NegativeItem, BUREAU_ADDRESSES, LETTER_TYPE_LABELS } from '@/types/credit';

interface LetterRequest {
  letter_type: LetterType;
  negative_item?: NegativeItem;
  user_info: {
    full_name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    ssn_last4?: string;
  };
  target_bureau?: 'equifax' | 'experian' | 'transunion';
  custom_params?: {
    hardship_reason?: string;
    years_customer?: number;
    offer_amount?: number;
  };
}

const LETTER_PROMPTS: Record<LetterType, string> = {
  '609_validation': `Generate a professional Section 609 credit dispute letter. This letter requests the credit bureau provide documentation proving the debt belongs to the consumer. Be firm but professional. Include:
- Reference to FCRA Section 609
- Request for original signed contract
- Request for complete payment history
- 30-day response deadline
- Demand for deletion if they cannot provide documentation`,

  'goodwill': `Generate a sincere goodwill adjustment letter. This letter requests removal of a late payment as a courtesy. Be humble and honest. Include:
- Acknowledgment of the late payment
- Brief explanation of hardship (if provided)
- Emphasis on otherwise good payment history
- Request for goodwill adjustment as a loyal customer`,

  'pay_for_delete': `Generate a pay-for-delete negotiation letter. This offers to pay a debt in exchange for removal from credit reports. Be professional and clear about terms. Include:
- Clear statement this is a settlement offer
- Specific payment amount offered
- Requirement for written agreement before payment
- Request for deletion from all three bureaus
- NOT an admission of debt validity`,

  'general_dispute': `Generate a general dispute letter challenging the accuracy of reported information. Be specific about what is being disputed. Include:
- Clear identification of the disputed item
- Specific reason for dispute
- Request for investigation
- 30-day response requirement under FCRA`,

  'debt_validation': `Generate a debt validation request letter under the FDCPA. This must be sent within 30 days of first contact from a collector. Include:
- Request for original creditor name
- Request for itemized debt breakdown
- Request for license to collect in consumer's state
- Demand to cease collection until validated
- Reference to FDCPA Section 809(b)`,

  'cease_desist': `Generate a cease and desist letter demanding all contact stop. Be firm and clear. Include:
- Explicit demand to stop all contact
- Reference to FDCPA rights
- Warning of legal action if contact continues
- Instruction to communicate only in writing`,

  'fraud_alert': `Generate a fraud alert letter to place on credit file. Include:
- Request for 90-day or 7-year fraud alert
- Request for free credit report
- Contact information for verification
- Brief description of suspected fraud`,
};

export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(10);
    if (guard.error) return guard.error;
    const { user, supabase } = guard;

    // Rate limit check
    const { tier } = await getUserTier(supabase, user.id);
    const rateCheck = await checkRateLimit(supabase, user.id, tier, 'ai_letter');
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: rateCheck.message,
        remaining: rateCheck.remaining,
      }, { status: 429 });
    }

    const body: LetterRequest = await request.json();
    const { letter_type, negative_item, user_info, target_bureau, custom_params } = body;

    // Validation
    if (!letter_type || !LETTER_PROMPTS[letter_type]) {
      return NextResponse.json({ error: 'Invalid letter type' }, { status: 400 });
    }

    if (!user_info?.full_name || !user_info?.address) {
      return NextResponse.json({ error: 'User name and address required' }, { status: 400 });
    }

    // Build context for AI
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let targetInfo = '';
    let targetAddress = '';
    
    if (target_bureau && BUREAU_ADDRESSES[target_bureau]) {
      const bureau = BUREAU_ADDRESSES[target_bureau];
      targetInfo = bureau.name;
      targetAddress = `${bureau.address}\n${bureau.city}, ${bureau.state} ${bureau.zip}`;
    } else if (negative_item?.creditor_name) {
      targetInfo = negative_item.creditor_name;
    }

    // Build the prompt
    const systemPrompt = `You are an expert credit repair specialist who writes effective dispute letters. 
Your letters are professional, legally sound, and follow all FCRA/FDCPA guidelines.
Generate ONLY the letter content - no explanations or notes.
Use formal business letter format.
Never include actual SSN - only last 4 digits if provided.
Today's date is ${today}.`;

    let userPrompt = LETTER_PROMPTS[letter_type] + '\n\n';
    
    userPrompt += `CONSUMER INFORMATION:
Name: ${user_info.full_name}
Address: ${user_info.address}
City/State/ZIP: ${user_info.city}, ${user_info.state} ${user_info.zip}`;
    
    if (user_info.phone) {
      userPrompt += `\nPhone: ${user_info.phone}`;
    }
    if (user_info.ssn_last4) {
      userPrompt += `\nSSN Last 4: ${user_info.ssn_last4}`;
    }

    if (targetInfo) {
      userPrompt += `\n\nTARGET:
${targetInfo}`;
      if (targetAddress) {
        userPrompt += `\n${targetAddress}`;
      }
    }

    if (negative_item) {
      userPrompt += `\n\nDISPUTED ACCOUNT:
Type: ${negative_item.item_type}
Creditor: ${negative_item.creditor_name}`;
      if (negative_item.original_creditor) {
        userPrompt += `\nOriginal Creditor: ${negative_item.original_creditor}`;
      }
      if (negative_item.account_number) {
        userPrompt += `\nAccount Number: ${negative_item.account_number}`;
      }
      if (negative_item.amount) {
        userPrompt += `\nAmount: $${negative_item.amount.toLocaleString()}`;
      }
      if (negative_item.date_reported) {
        userPrompt += `\nDate Reported: ${negative_item.date_reported}`;
      }
      
      const bureaus = [];
      if (negative_item.on_equifax) bureaus.push('Equifax');
      if (negative_item.on_experian) bureaus.push('Experian');
      if (negative_item.on_transunion) bureaus.push('TransUnion');
      if (bureaus.length > 0) {
        userPrompt += `\nReporting Bureaus: ${bureaus.join(', ')}`;
      }
    }

    if (custom_params) {
      if (custom_params.hardship_reason) {
        userPrompt += `\n\nHARDSHIP REASON: ${custom_params.hardship_reason}`;
      }
      if (custom_params.years_customer) {
        userPrompt += `\nYears as Customer: ${custom_params.years_customer}`;
      }
      if (custom_params.offer_amount) {
        userPrompt += `\nSettlement Offer Amount: $${custom_params.offer_amount}`;
      }
    }

    userPrompt += '\n\nGenerate the complete letter now:';

    // Call AI
    const response = await callOpenRouter({
      model: 'anthropic/claude-sonnet-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    // Increment usage
    await incrementUsage(supabase, user.id, 'ai_letter');

    // Generate tips based on letter type
    const tips = getTipsForLetterType(letter_type);

    return NextResponse.json({
      letter_content: response.content,
      letter_type,
      letter_type_label: LETTER_TYPE_LABELS[letter_type],
      suggested_target: targetInfo,
      suggested_target_address: targetAddress || undefined,
      tips,
    });

  } catch (error) {
    console.error('Letter generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate letter' },
      { status: 500 }
    );
  }
}

function getTipsForLetterType(letterType: LetterType): string[] {
  const tips: Record<LetterType, string[]> = {
    '609_validation': [
      'Send via certified mail with return receipt requested',
      'Keep copies of everything you send',
      'The bureau has 30 days to respond',
      'If they can\'t provide documentation, demand deletion',
    ],
    'goodwill': [
      'Be sincere and take responsibility',
      'Mention your long history if applicable',
      'Follow up with a phone call in 2 weeks',
      'Try multiple times - persistence pays off',
    ],
    'pay_for_delete': [
      'Never pay without written agreement first',
      'Get the agreement signed before sending money',
      'Use cashier\'s check or money order, never debit',
      'Keep copies of all correspondence',
    ],
    'general_dispute': [
      'Be specific about what\'s incorrect',
      'Include any supporting documentation',
      'The bureau must investigate within 30 days',
      'Request written confirmation of results',
    ],
    'debt_validation': [
      'Must be sent within 30 days of first collector contact',
      'They must stop collection until they validate',
      'If they can\'t validate, they can\'t collect or report',
      'Send certified mail with return receipt',
    ],
    'cease_desist': [
      'They must stop calling after receiving this',
      'They can still sue or report to credit bureaus',
      'Keep records of any violations',
      'Consider consulting an attorney for FDCPA violations',
    ],
    'fraud_alert': [
      'Consider a credit freeze for stronger protection',
      'File a police report if identity theft occurred',
      'Get your free credit reports from all 3 bureaus',
      'Review all accounts for unauthorized activity',
    ],
  };

  return tips[letterType] || [];
}
