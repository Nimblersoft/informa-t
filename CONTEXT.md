# informa-t Domain

This glossary fixes the domain language used across the future product, its user interface, and its documentation. It defines terms from the supplied MediaHack II PRD draft without prescribing an implementation.

## Language

**Claim**:
A discrete, externally checkable assertion extracted from submitted material for an editor to investigate.
_Avoid_: rumor, verdict

**Evidence record**:
The auditable collection of source excerpts, links, and analysis associated with a claim.
_Avoid_: proof, citation list

**Primary source**:
An original institutional document or dataset used as the direct basis for contrast, such as an official CNE plan or INEC dataset.
_Avoid_: secondary coverage, opinion source

**Source registry**:
The curated list of institutions and collections whose artifacts may enter an evidence record, together with their provenance and coverage limits.
_Avoid_: the whole web, automatic ground truth

**Official artifact**:
A versioned document, dataset, record, or audiovisual publication obtained from a primary source and preserved with enough provenance to identify the exact material reviewed.
_Avoid_: institution homepage, unsourced model context

**Evidence excerpt**:
An addressable passage, row, page, or segment from an official artifact that bears directly on a claim.
_Avoid_: model summary, unsupported citation

**Related context**:
News coverage or other secondary material discovered around a claim and shown separately from the evidence record. It may guide investigation but cannot establish the editorial decision by itself.
_Avoid_: primary evidence, proof

**Model proposal**:
A structured, non-binding analysis produced by one model for review alongside other proposals and the evidence record.
_Avoid_: verdict, editorial decision

**Analysis trace**:
The auditable record of inputs, source references, model and prompt versions, structured outputs, disagreement, timing, and errors used to produce model proposals. It excludes hidden chain-of-thought.
_Avoid_: chain-of-thought log, proof of correctness

**Structured rationale**:
A concise, inspectable explanation that connects a model proposal to the cited evidence, applied rubric, uncertainties, and limitations without exposing or claiming access to hidden chain-of-thought.
_Avoid_: private reasoning, thought transcript, certainty proof

**Editorial decision**:
The journalist's documented conclusion after reviewing a claim and its evidence record.
_Avoid_: automated verdict, model output

**Editorial verdict**:
The category explicitly selected by the journalist for an editorial decision: Cierto, Falso, Impreciso, Enganoso, Satira, or Inverificable, following the current six-category Ecuador Chequea methodology adopted by the MVP.
_Avoid_: automatic label, model consensus

**Human-in-the-loop**:
The governance boundary that reserves public classification and publication decisions for a responsible human editor.
_Avoid_: autonomous fact-checking, automatic publication

**ClaimReview**:
The Schema.org structured-data format intended to represent a reviewed claim and its review outcome.
_Avoid_: internal evidence record, model response
