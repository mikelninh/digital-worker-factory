----------------------------- MODULE OCNTrustKernel -----------------------------
EXTENDS Naturals, TLC

VARIABLES phase,
          merchantVerified,
          merchantMatches,
          beneficiaryMatches,
          amountMatches,
          currencyMatches,
          intentFresh,
          replayDetected,
          mandateCovered,
          humanApproved,
          paid,
          executionCount

vars == << phase,
           merchantVerified,
           merchantMatches,
           beneficiaryMatches,
           amountMatches,
           currencyMatches,
           intentFresh,
           replayDetected,
           mandateCovered,
           humanApproved,
           paid,
           executionCount >>

HardBindings ==
    merchantVerified
    /\ merchantMatches
    /\ beneficiaryMatches
    /\ amountMatches
    /\ currencyMatches
    /\ intentFresh
    /\ ~replayDetected

Authorized == mandateCovered \/ humanApproved

Init ==
    /\ phase = "requested"
    /\ merchantVerified \in BOOLEAN
    /\ merchantMatches \in BOOLEAN
    /\ beneficiaryMatches \in BOOLEAN
    /\ amountMatches \in BOOLEAN
    /\ currencyMatches \in BOOLEAN
    /\ intentFresh \in BOOLEAN
    /\ replayDetected \in BOOLEAN
    /\ mandateCovered \in BOOLEAN
    /\ humanApproved \in BOOLEAN
    /\ paid \in BOOLEAN
    /\ executionCount = 0

VerifyGood ==
    /\ phase = "requested"
    /\ HardBindings
    /\ phase' = "verified"
    /\ UNCHANGED << merchantVerified, merchantMatches, beneficiaryMatches,
                    amountMatches, currencyMatches, intentFresh, replayDetected,
                    mandateCovered, humanApproved, paid, executionCount >>

VerifyBlock ==
    /\ phase = "requested"
    /\ ~HardBindings
    /\ phase' = "blocked"
    /\ UNCHANGED << merchantVerified, merchantMatches, beneficiaryMatches,
                    amountMatches, currencyMatches, intentFresh, replayDetected,
                    mandateCovered, humanApproved, paid, executionCount >>

Authorize ==
    /\ phase = "verified"
    /\ Authorized
    /\ phase' = "approved"
    /\ UNCHANGED << merchantVerified, merchantMatches, beneficiaryMatches,
                    amountMatches, currencyMatches, intentFresh, replayDetected,
                    mandateCovered, humanApproved, paid, executionCount >>

NeedsReview ==
    /\ phase = "verified"
    /\ ~Authorized
    /\ phase' = "review"
    /\ UNCHANGED << merchantVerified, merchantMatches, beneficiaryMatches,
                    amountMatches, currencyMatches, intentFresh, replayDetected,
                    mandateCovered, humanApproved, paid, executionCount >>

HumanApprove ==
    /\ phase = "review"
    /\ phase' = "approved"
    /\ humanApproved' = TRUE
    /\ UNCHANGED << merchantVerified, merchantMatches, beneficiaryMatches,
                    amountMatches, currencyMatches, intentFresh, replayDetected,
                    mandateCovered, paid, executionCount >>

StartExecution ==
    /\ phase = "approved"
    /\ phase' = "executing"
    /\ UNCHANGED << merchantVerified, merchantMatches, beneficiaryMatches,
                    amountMatches, currencyMatches, intentFresh, replayDetected,
                    mandateCovered, humanApproved, paid, executionCount >>

FinishExecution ==
    /\ phase = "executing"
    /\ executionCount = 0
    /\ phase' = "executed"
    /\ executionCount' = 1
    /\ UNCHANGED << merchantVerified, merchantMatches, beneficiaryMatches,
                    amountMatches, currencyMatches, intentFresh, replayDetected,
                    mandateCovered, humanApproved, paid >>

TerminalStutter ==
    /\ phase \in {"blocked", "executed"}
    /\ UNCHANGED vars

Next == VerifyGood \/ VerifyBlock \/ Authorize \/ NeedsReview \/ HumanApprove \/ StartExecution \/ FinishExecution \/ TerminalStutter

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ phase \in {"requested", "verified", "review", "approved", "executing", "executed", "blocked"}
    /\ merchantVerified \in BOOLEAN
    /\ merchantMatches \in BOOLEAN
    /\ beneficiaryMatches \in BOOLEAN
    /\ amountMatches \in BOOLEAN
    /\ currencyMatches \in BOOLEAN
    /\ intentFresh \in BOOLEAN
    /\ replayDetected \in BOOLEAN
    /\ mandateCovered \in BOOLEAN
    /\ humanApproved \in BOOLEAN
    /\ paid \in BOOLEAN
    /\ executionCount \in 0..1

HardBindingsRequired == phase \in {"verified", "review", "approved", "executing", "executed"} => HardBindings
AuthorizationRequired == phase \in {"approved", "executing", "executed"} => Authorized
PaymentNeverGrantsAuthority == phase \in {"approved", "executing", "executed"} => (mandateCovered \/ humanApproved)
AtMostOnce == executionCount <= 1
NoExecutionInReviewOrBlocked == phase \in {"review", "blocked"} => executionCount = 0
NoExecutionOnReplay == replayDetected => executionCount = 0
NoExecutionOnMerchantMismatch == (~merchantVerified \/ ~merchantMatches) => executionCount = 0
NoExecutionOnBeneficiaryMismatch == ~beneficiaryMatches => executionCount = 0
NoExecutionOnAmountMismatch == ~amountMatches => executionCount = 0
NoExecutionOnCurrencyMismatch == ~currencyMatches => executionCount = 0
NoExecutionOnExpiredIntent == ~intentFresh => executionCount = 0

=============================================================================
