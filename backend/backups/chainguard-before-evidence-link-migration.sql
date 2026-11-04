--
-- PostgreSQL database dump
--

\restrict eH7tA3AI288FKev0g6WWtGBtR6v4huRng8wmJkxgwEoaqDRWXMnxa7F1ZAfdZKE

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: chainguard_app
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO chainguard_app;

--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: chainguard_app
--

CREATE TABLE public.audit_events (
    id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(80) NOT NULL,
    event_type character varying(80) NOT NULL,
    actor character varying(120) NOT NULL,
    details jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_events OWNER TO chainguard_app;

--
-- Name: evidence_records; Type: TABLE; Schema: public; Owner: chainguard_app
--

CREATE TABLE public.evidence_records (
    id uuid NOT NULL,
    case_id uuid NOT NULL,
    chain_id bigint NOT NULL,
    transaction_hash character varying(66) NOT NULL,
    block_number bigint NOT NULL,
    receipt_status integer NOT NULL,
    token_address character varying(42) NOT NULL,
    sender_address character varying(42) NOT NULL,
    recipient_address character varying(42) NOT NULL,
    amount_raw numeric(78,0) NOT NULL,
    log_index integer NOT NULL,
    source character varying(60) NOT NULL,
    raw_evidence jsonb NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.evidence_records OWNER TO chainguard_app;

--
-- Name: investigation_reports; Type: TABLE; Schema: public; Owner: chainguard_app
--

CREATE TABLE public.investigation_reports (
    id uuid NOT NULL,
    case_id uuid NOT NULL,
    report_type character varying(40) NOT NULL,
    report jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.investigation_reports OWNER TO chainguard_app;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: chainguard_app
--

CREATE TABLE public.payments (
    id uuid NOT NULL,
    external_reference character varying(120) NOT NULL,
    chain_id bigint NOT NULL,
    asset_symbol character varying(20) NOT NULL,
    token_address character varying(42) NOT NULL,
    expected_amount numeric(36,18) NOT NULL,
    expected_sender character varying(42),
    expected_recipient character varying(42) NOT NULL,
    expected_tx_hash character varying(66),
    status character varying(30) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_payments_expected_amount_positive CHECK ((expected_amount > (0)::numeric))
);


ALTER TABLE public.payments OWNER TO chainguard_app;

--
-- Name: reconciliation_cases; Type: TABLE; Schema: public; Owner: chainguard_app
--

CREATE TABLE public.reconciliation_cases (
    id uuid NOT NULL,
    payment_id uuid NOT NULL,
    status character varying(30) NOT NULL,
    result character varying(30) NOT NULL,
    expected_amount numeric(36,18) NOT NULL,
    observed_amount numeric(36,18),
    difference numeric(36,18),
    summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


ALTER TABLE public.reconciliation_cases OWNER TO chainguard_app;

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: chainguard_app
--

COPY public.alembic_version (version_num) FROM stdin;
8c42a1d7e903
\.


--
-- Data for Name: audit_events; Type: TABLE DATA; Schema: public; Owner: chainguard_app
--

COPY public.audit_events (id, entity_type, entity_id, event_type, actor, details, created_at) FROM stdin;
1b49ee94-3e49-44f8-983b-0420d497d912	reconciliation_case	4561d927-a159-4063-a5b2-8d0db9e98eac	RECONCILIATION_MATCHED	system	{"chain_id": 1337, "payment_id": "2b4ac8a5-4423-442f-94ae-6564635aecb5", "token_decimals": 18, "expected_amount": "100.000000000000000000", "observed_amount": "100", "transaction_hash": "0x92e66171e0e659004de41195a2aac4cdf3172ddc18c96b4ac497b428c6b27d04", "transfer_event_count": 1}	2026-10-28 22:37:55.922507+00
b27af780-02f6-447c-9b33-cd71798d32da	reconciliation_case	b9e7a6cc-4c7f-4112-b7a0-334aae1f3014	RECONCILIATION_DISCREPANCY	system	{"chain_id": 1337, "payment_id": "7a0d2161-a867-4231-9da7-e61dd819885c", "receipt_status": 1, "expected_amount": "100.000000000000000000", "observed_amount": "80", "transaction_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf", "new_evidence_count": 1, "transfer_event_count": 1}	2026-10-28 23:04:05.152793+00
3c1a215e-e9b9-433c-b7d8-1f102187337a	reconciliation_case	77099c27-e119-4f29-85fd-5821acf982b6	RECONCILIATION_MATCHED	system	{"chain_id": 1337, "payment_id": "220774c6-2157-4a72-9e91-96a8052e0968", "receipt_status": 1, "expected_amount": "50.000000000000000000", "observed_amount": "50", "transaction_hash": "0xdaa75fd89745f896c85dfb077c83a67fe22abb229c246cb389debe3dc53a9fcb", "new_evidence_count": 1, "transfer_event_count": 1}	2026-10-28 23:54:01.383397+00
eb30fbe1-e47b-4d43-a8e9-f4376a39abbd	reconciliation_case	b9e7a6cc-4c7f-4112-b7a0-334aae1f3014	CASE_STATUS_CORRECTED	system	{"reason": "A payment discrepancy requires investigation.", "result": "DISCREPANCY", "new_status": "OPEN", "new_resolved_at": null, "previous_status": "RESOLVED", "previous_resolved_at": "2026-10-28T23:04:05.229714+00:00"}	2026-10-30 14:35:39.282704+00
0af98d81-df39-49b1-9572-bd6bfb84910d	reconciliation_case	baecbf75-9952-44f3-85a2-1bc7487af587	RECONCILIATION_DISCREPANCY	system	{"chain_id": 1337, "payment_id": "0eac0269-f078-4660-a16f-019e395c4414", "receipt_status": 1, "expected_amount": "100.000000000000000000", "observed_amount": "50", "transaction_hash": "0xdaa75fd89745f896c85dfb077c83a67fe22abb229c246cb389debe3dc53a9fcb", "new_evidence_count": 0, "transfer_event_count": 1}	2026-10-30 15:47:11.885398+00
\.


--
-- Data for Name: evidence_records; Type: TABLE DATA; Schema: public; Owner: chainguard_app
--

COPY public.evidence_records (id, case_id, chain_id, transaction_hash, block_number, receipt_status, token_address, sender_address, recipient_address, amount_raw, log_index, source, raw_evidence, recorded_at) FROM stdin;
3de3d54b-c5ae-4ded-b11a-13454d1cf839	4561d927-a159-4063-a5b2-8d0db9e98eac	1337	0x92e66171e0e659004de41195a2aac4cdf3172ddc18c96b4ac497b428c6b27d04	3	1	0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d	0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c	0xd06E8329C36dAe40c4C215Db144DB662F0f460B1	100000000000000000000	0	rpc_transaction_and_receipt	{"sender": "0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c", "log_index": 0, "recipient": "0xd06E8329C36dAe40c4C215Db144DB662F0f460B1", "amount_raw": "100000000000000000000", "transaction_hash": "0x92e66171e0e659004de41195a2aac4cdf3172ddc18c96b4ac497b428c6b27d04"}	2026-10-28 22:37:55.922507+00
f9eac7b7-058a-4623-9b12-d26ef3b1a9bd	b9e7a6cc-4c7f-4112-b7a0-334aae1f3014	1337	0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf	5	1	0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d	0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c	0xd06E8329C36dAe40c4C215Db144DB662F0f460B1	80000000000000000000	0	rpc_transaction_and_receipt	{"sender": "0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c", "log_index": 0, "recipient": "0xd06E8329C36dAe40c4C215Db144DB662F0f460B1", "amount_raw": "80000000000000000000", "transaction_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf"}	2026-10-28 23:04:05.152793+00
5964f9a6-fc1e-4973-8a82-274ce45c72f3	77099c27-e119-4f29-85fd-5821acf982b6	1337	0xdaa75fd89745f896c85dfb077c83a67fe22abb229c246cb389debe3dc53a9fcb	6	1	0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d	0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c	0xd06E8329C36dAe40c4C215Db144DB662F0f460B1	50000000000000000000	0	rpc_transaction_and_receipt	{"sender": "0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c", "receipt": {"status": 1, "gas_used": 35089, "block_hash": "0xcf46e67b97908dc138b25bd6e60cb0a16c29ec8c9ef4eb2560c66256c74a8841", "block_number": 6, "transaction_index": 0, "effective_gas_price_wei": "578948983"}, "log_index": 0, "recipient": "0xd06E8329C36dAe40c4C215Db144DB662F0f460B1", "amount_raw": "50000000000000000000", "transaction": {"hash": "0xdaa75fd89745f896c85dfb077c83a67fe22abb229c246cb389debe3dc53a9fcb", "nonce": 5, "sender": "0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c", "gas_limit": 35089, "value_wei": "0", "block_hash": "0xcf46e67b97908dc138b25bd6e60cb0a16c29ec8c9ef4eb2560c66256c74a8841", "destination": "0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d", "block_number": 6, "gas_price_wei": "578948983"}, "transfer_log": {"data": "0x000000000000000000000000000000000000000000000002b5e3af16b1880000", "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x000000000000000000000000b8ab8f0d64db940066d8ddc730a5263f9163b48c", "0x000000000000000000000000d06e8329c36dae40c4c215db144db662f0f460b1"], "address": "0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d", "removed": false, "log_index": 0, "block_hash": "0xcf46e67b97908dc138b25bd6e60cb0a16c29ec8c9ef4eb2560c66256c74a8841", "block_number": 6, "transaction_index": 0}, "transaction_hash": "0xdaa75fd89745f896c85dfb077c83a67fe22abb229c246cb389debe3dc53a9fcb"}	2026-10-28 23:54:01.383397+00
\.


--
-- Data for Name: investigation_reports; Type: TABLE DATA; Schema: public; Owner: chainguard_app
--

COPY public.investigation_reports (id, case_id, report_type, report, created_at) FROM stdin;
06729cdd-bee9-4b5c-8ec6-eb28290af03d	b9e7a6cc-4c7f-4112-b7a0-334aae1f3014	DETERMINISTIC	{"case": {"result": "DISCREPANCY", "status": "RESOLVED", "case_id": "b9e7a6cc-4c7f-4112-b7a0-334aae1f3014", "summary": "The transaction evidence does not fully match the expected payment."}, "payment": {"status": "RECONCILIATION_REQUIRED", "chain_id": 1337, "payment_id": "7a0d2161-a867-4231-9da7-e61dd819885c", "asset_symbol": "CGT", "expected_tx_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf", "external_reference": "CG-DEMO-MISMATCH-001"}, "evidence": [{"source": "rpc_transaction_and_receipt", "chain_id": 1337, "log_index": 0, "amount_raw": "80000000000000000000", "evidence_id": "f9eac7b7-058a-4623-9b12-d26ef3b1a9bd", "block_number": 5, "token_address": "0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d", "receipt_status": 1, "sender_address": "0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c", "transaction_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf", "recipient_address": "0xd06E8329C36dAe40c4C215Db144DB662F0f460B1"}], "findings": [{"code": "AMOUNT_DISCREPANCY", "message": "The observed amount is short by 20.000000000000000000 CGT.", "severity": "high", "evidence_basis": ["expected_amount", "observed_amount"]}], "unknowns": ["The underlying cause of any discrepancy has not been established by this report.", "No inference is made about intent, fraud, or responsibility.", "This report uses persisted reconciliation and evidence records; it does not independently re-query the blockchain."], "limitations": ["This is a deterministic report, not an AI-generated investigation.", "Conclusions are limited to the stored records referenced in this report."], "generated_at": "2026-10-29T00:06:03.401229+00:00", "schema_version": "1.0", "verified_facts": [{"fact": "reconciliation_result", "value": "DISCREPANCY", "source": "postgresql.reconciliation_cases"}, {"fact": "payment_status", "value": "RECONCILIATION_REQUIRED", "source": "postgresql.payments"}, {"fact": "expected_amount", "asset": "CGT", "value": "100.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_amount", "asset": "CGT", "value": "80.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_minus_expected", "asset": "CGT", "value": "-20.000000000000000000", "source": "deterministic_calculation"}], "audit_event_ids": ["b27af780-02f6-447c-9b33-cd71798d32da"], "investigation_mode": "DETERMINISTIC"}	2026-10-29 00:06:03.389205+00
2cccd5ab-1eaa-405f-8f27-1df1a31b98f7	b9e7a6cc-4c7f-4112-b7a0-334aae1f3014	DETERMINISTIC	{"case": {"result": "DISCREPANCY", "status": "OPEN", "case_id": "b9e7a6cc-4c7f-4112-b7a0-334aae1f3014", "summary": "The transaction evidence does not fully match the expected payment."}, "payment": {"status": "RECONCILIATION_REQUIRED", "chain_id": 1337, "payment_id": "7a0d2161-a867-4231-9da7-e61dd819885c", "asset_symbol": "CGT", "expected_tx_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf", "external_reference": "CG-DEMO-MISMATCH-001"}, "evidence": [{"source": "rpc_transaction_and_receipt", "chain_id": 1337, "log_index": 0, "amount_raw": "80000000000000000000", "evidence_id": "f9eac7b7-058a-4623-9b12-d26ef3b1a9bd", "block_number": 5, "token_address": "0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d", "receipt_status": 1, "sender_address": "0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c", "transaction_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf", "recipient_address": "0xd06E8329C36dAe40c4C215Db144DB662F0f460B1"}], "findings": [{"code": "AMOUNT_DISCREPANCY", "message": "The observed amount is short by 20.000000000000000000 CGT.", "severity": "high", "evidence_basis": ["expected_amount", "observed_amount"]}], "unknowns": ["The underlying cause of any discrepancy has not been established by this report.", "No inference is made about intent, fraud, or responsibility.", "This report uses persisted reconciliation and evidence records; it does not independently re-query the blockchain."], "limitations": ["This is a deterministic report, not an AI-generated investigation.", "Conclusions are limited to the stored records referenced in this report."], "generated_at": "2026-10-30T14:36:53.528462+00:00", "schema_version": "1.0", "verified_facts": [{"fact": "reconciliation_result", "value": "DISCREPANCY", "source": "postgresql.reconciliation_cases"}, {"fact": "payment_status", "value": "RECONCILIATION_REQUIRED", "source": "postgresql.payments"}, {"fact": "expected_amount", "asset": "CGT", "value": "100.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_amount", "asset": "CGT", "value": "80.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_minus_expected", "asset": "CGT", "value": "-20.000000000000000000", "source": "deterministic_calculation"}], "audit_event_ids": ["b27af780-02f6-447c-9b33-cd71798d32da", "eb30fbe1-e47b-4d43-a8e9-f4376a39abbd"], "investigation_mode": "DETERMINISTIC"}	2026-10-30 14:36:53.519833+00
cf97b86d-4e87-44bd-8026-b91c6686d395	b9e7a6cc-4c7f-4112-b7a0-334aae1f3014	DETERMINISTIC	{"case": {"result": "DISCREPANCY", "status": "OPEN", "case_id": "b9e7a6cc-4c7f-4112-b7a0-334aae1f3014", "summary": "The transaction evidence does not fully match the expected payment."}, "payment": {"status": "RECONCILIATION_REQUIRED", "chain_id": 1337, "payment_id": "7a0d2161-a867-4231-9da7-e61dd819885c", "asset_symbol": "CGT", "expected_tx_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf", "external_reference": "CG-DEMO-MISMATCH-001"}, "evidence": [{"source": "rpc_transaction_and_receipt", "chain_id": 1337, "log_index": 0, "amount_raw": "80000000000000000000", "evidence_id": "f9eac7b7-058a-4623-9b12-d26ef3b1a9bd", "block_number": 5, "token_address": "0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d", "receipt_status": 1, "sender_address": "0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c", "transaction_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf", "recipient_address": "0xd06E8329C36dAe40c4C215Db144DB662F0f460B1"}], "findings": [{"code": "AMOUNT_DISCREPANCY", "message": "The observed amount is short by 20.000000000000000000 CGT.", "severity": "high", "evidence_basis": ["expected_amount", "observed_amount"]}], "unknowns": ["The underlying cause of any discrepancy has not been established by this report.", "No inference is made about intent, fraud, or responsibility.", "This report uses persisted reconciliation and evidence records; it does not independently re-query the blockchain."], "limitations": ["This is a deterministic report, not an AI-generated investigation.", "Conclusions are limited to the stored records referenced in this report."], "generated_at": "2026-10-30T14:37:20.794454+00:00", "schema_version": "1.0", "verified_facts": [{"fact": "reconciliation_result", "value": "DISCREPANCY", "source": "postgresql.reconciliation_cases"}, {"fact": "payment_status", "value": "RECONCILIATION_REQUIRED", "source": "postgresql.payments"}, {"fact": "expected_amount", "asset": "CGT", "value": "100.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_amount", "asset": "CGT", "value": "80.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_minus_expected", "asset": "CGT", "value": "-20.000000000000000000", "source": "deterministic_calculation"}], "audit_event_ids": ["b27af780-02f6-447c-9b33-cd71798d32da", "eb30fbe1-e47b-4d43-a8e9-f4376a39abbd"], "investigation_mode": "DETERMINISTIC"}	2026-10-30 14:37:20.787854+00
879c2b7b-a6d7-4158-8516-0e202c04d848	b9e7a6cc-4c7f-4112-b7a0-334aae1f3014	DETERMINISTIC	{"case": {"result": "DISCREPANCY", "status": "OPEN", "case_id": "b9e7a6cc-4c7f-4112-b7a0-334aae1f3014", "summary": "The transaction evidence does not fully match the expected payment."}, "payment": {"status": "RECONCILIATION_REQUIRED", "chain_id": 1337, "payment_id": "7a0d2161-a867-4231-9da7-e61dd819885c", "asset_symbol": "CGT", "expected_tx_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf", "external_reference": "CG-DEMO-MISMATCH-001"}, "evidence": [{"source": "rpc_transaction_and_receipt", "chain_id": 1337, "log_index": 0, "amount_raw": "80000000000000000000", "evidence_id": "f9eac7b7-058a-4623-9b12-d26ef3b1a9bd", "block_number": 5, "token_address": "0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d", "receipt_status": 1, "sender_address": "0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c", "transaction_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf", "recipient_address": "0xd06E8329C36dAe40c4C215Db144DB662F0f460B1"}], "findings": [{"code": "AMOUNT_DISCREPANCY", "message": "The observed amount is short by 20.000000000000000000 CGT.", "severity": "high", "evidence_basis": ["expected_amount", "observed_amount"]}], "unknowns": ["The underlying cause of any discrepancy has not been established by this report.", "No inference is made about intent, fraud, or responsibility.", "This report uses persisted reconciliation and evidence records; it does not independently re-query the blockchain."], "limitations": ["This is a deterministic report, not an AI-generated investigation.", "Conclusions are limited to the stored records referenced in this report."], "generated_at": "2026-10-30T14:42:36.985176+00:00", "schema_version": "1.0", "verified_facts": [{"fact": "reconciliation_result", "value": "DISCREPANCY", "source": "postgresql.reconciliation_cases"}, {"fact": "payment_status", "value": "RECONCILIATION_REQUIRED", "source": "postgresql.payments"}, {"fact": "expected_amount", "asset": "CGT", "value": "100.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_amount", "asset": "CGT", "value": "80.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_minus_expected", "asset": "CGT", "value": "-20.000000000000000000", "source": "deterministic_calculation"}], "audit_event_ids": ["b27af780-02f6-447c-9b33-cd71798d32da", "eb30fbe1-e47b-4d43-a8e9-f4376a39abbd"], "investigation_mode": "DETERMINISTIC"}	2026-10-30 14:42:36.979183+00
6ac6eb18-80d5-4eb1-9f8e-94e515f16e99	b9e7a6cc-4c7f-4112-b7a0-334aae1f3014	DETERMINISTIC	{"case": {"result": "DISCREPANCY", "status": "OPEN", "case_id": "b9e7a6cc-4c7f-4112-b7a0-334aae1f3014", "summary": "The transaction evidence does not fully match the expected payment."}, "payment": {"status": "RECONCILIATION_REQUIRED", "chain_id": 1337, "payment_id": "7a0d2161-a867-4231-9da7-e61dd819885c", "asset_symbol": "CGT", "expected_tx_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf", "external_reference": "CG-DEMO-MISMATCH-001"}, "evidence": [{"source": "rpc_transaction_and_receipt", "chain_id": 1337, "log_index": 0, "amount_raw": "80000000000000000000", "evidence_id": "f9eac7b7-058a-4623-9b12-d26ef3b1a9bd", "block_number": 5, "token_address": "0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d", "receipt_status": 1, "sender_address": "0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c", "transaction_hash": "0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf", "recipient_address": "0xd06E8329C36dAe40c4C215Db144DB662F0f460B1"}], "findings": [{"code": "AMOUNT_DISCREPANCY", "message": "The observed amount is short by 20.000000000000000000 CGT.", "severity": "high", "evidence_basis": ["expected_amount", "observed_amount"]}], "unknowns": ["The underlying cause of any discrepancy has not been established by this report.", "No inference is made about intent, fraud, or responsibility.", "This report uses persisted reconciliation and evidence records; it does not independently re-query the blockchain."], "limitations": ["This is a deterministic report, not an AI-generated investigation.", "Conclusions are limited to the stored records referenced in this report."], "generated_at": "2026-10-30T15:02:15.211880+00:00", "schema_version": "1.0", "verified_facts": [{"fact": "reconciliation_result", "value": "DISCREPANCY", "source": "postgresql.reconciliation_cases"}, {"fact": "payment_status", "value": "RECONCILIATION_REQUIRED", "source": "postgresql.payments"}, {"fact": "expected_amount", "asset": "CGT", "value": "100.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_amount", "asset": "CGT", "value": "80.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_minus_expected", "asset": "CGT", "value": "-20.000000000000000000", "source": "deterministic_calculation"}], "audit_event_ids": ["b27af780-02f6-447c-9b33-cd71798d32da", "eb30fbe1-e47b-4d43-a8e9-f4376a39abbd"], "investigation_id": "6ac6eb18-80d5-4eb1-9f8e-94e515f16e99", "investigation_mode": "DETERMINISTIC"}	2026-10-30 15:02:15.205348+00
6e21d14a-e0ec-497e-82bc-ebeb06f4f316	baecbf75-9952-44f3-85a2-1bc7487af587	DETERMINISTIC	{"case": {"result": "DISCREPANCY", "status": "RESOLVED", "case_id": "baecbf75-9952-44f3-85a2-1bc7487af587", "summary": "The transaction evidence does not fully match the expected payment."}, "payment": {"status": "RECONCILIATION_REQUIRED", "chain_id": 1337, "payment_id": "0eac0269-f078-4660-a16f-019e395c4414", "asset_symbol": "CGT", "expected_tx_hash": "0xdaa75fd89745f896c85dfb077c83a67fe22abb229c246cb389debe3dc53a9fcb", "external_reference": "CG-TEST-002"}, "evidence": [], "findings": [{"code": "AMOUNT_DISCREPANCY", "message": "The observed amount is short by 50.000000000000000000 CGT.", "severity": "high", "evidence_basis": ["expected_amount", "observed_amount"]}, {"code": "NO_PERSISTED_CHAIN_EVIDENCE", "message": "No persisted blockchain evidence records were found for this case.", "severity": "high", "evidence_basis": []}], "unknowns": ["The underlying cause of any discrepancy has not been established by this report.", "No inference is made about intent, fraud, or responsibility.", "This report uses persisted reconciliation and evidence records; it does not independently re-query the blockchain."], "limitations": ["This is a deterministic report, not an AI-generated investigation.", "Conclusions are limited to the stored records referenced in this report."], "generated_at": "2026-10-30T15:48:01.823764+00:00", "schema_version": "1.0", "verified_facts": [{"fact": "reconciliation_result", "value": "DISCREPANCY", "source": "postgresql.reconciliation_cases"}, {"fact": "payment_status", "value": "RECONCILIATION_REQUIRED", "source": "postgresql.payments"}, {"fact": "expected_amount", "asset": "CGT", "value": "100.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_amount", "asset": "CGT", "value": "50.000000000000000000", "source": "postgresql.reconciliation_cases"}, {"fact": "observed_minus_expected", "asset": "CGT", "value": "-50.000000000000000000", "source": "deterministic_calculation"}], "audit_event_ids": ["0af98d81-df39-49b1-9572-bd6bfb84910d"], "investigation_id": "6e21d14a-e0ec-497e-82bc-ebeb06f4f316", "investigation_mode": "DETERMINISTIC"}	2026-10-30 15:48:01.815396+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: chainguard_app
--

COPY public.payments (id, external_reference, chain_id, asset_symbol, token_address, expected_amount, expected_sender, expected_recipient, expected_tx_hash, status, created_at, updated_at) FROM stdin;
2b4ac8a5-4423-442f-94ae-6564635aecb5	CG-DEMO-001	1337	CGT	0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d	100.000000000000000000	0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c	0xd06E8329C36dAe40c4C215Db144DB662F0f460B1	0x92e66171e0e659004de41195a2aac4cdf3172ddc18c96b4ac497b428c6b27d04	CONFIRMED	2026-10-28 22:35:26.359873+00	2026-10-28 22:37:55.922507+00
7a0d2161-a867-4231-9da7-e61dd819885c	CG-DEMO-MISMATCH-001	1337	CGT	0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d	100.000000000000000000	0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c	0xd06E8329C36dAe40c4C215Db144DB662F0f460B1	0x7a123ea838791493ad63a5614167637cfea73e0f1cf319dd99c644c9fd9367cf	RECONCILIATION_REQUIRED	2026-10-28 23:01:07.539555+00	2026-10-28 23:04:05.152793+00
220774c6-2157-4a72-9e91-96a8052e0968	CG-DEMO-STRUCTURED-001	1337	CGT	0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d	50.000000000000000000	0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c	0xd06E8329C36dAe40c4C215Db144DB662F0f460B1	0xdaa75fd89745f896c85dfb077c83a67fe22abb229c246cb389debe3dc53a9fcb	CONFIRMED	2026-10-28 23:45:01.061405+00	2026-10-28 23:54:01.383397+00
6b4204d0-bd11-4e79-aa13-11def4171fa6	CG-TEST-001	1337	CGT	0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d	100.000000000000000000	\N	0x0000000000000000000000000000000000000002	\N	PENDING	2026-10-30 15:44:21.414126+00	2026-10-30 15:44:21.414126+00
0eac0269-f078-4660-a16f-019e395c4414	CG-TEST-002	1337	CGT	0x0B32CAF1D06CaCC7dd701aA05e56768AbC88bA9d	100.000000000000000000	0xb8AB8f0d64DB940066D8dDC730A5263f9163b48c	0xd06E8329C36dAe40c4C215Db144DB662F0f460B1	0xdaa75fd89745f896c85dfb077c83a67fe22abb229c246cb389debe3dc53a9fcb	RECONCILIATION_REQUIRED	2026-10-30 15:46:40.514246+00	2026-10-30 15:47:11.885398+00
\.


--
-- Data for Name: reconciliation_cases; Type: TABLE DATA; Schema: public; Owner: chainguard_app
--

COPY public.reconciliation_cases (id, payment_id, status, result, expected_amount, observed_amount, difference, summary, created_at, resolved_at) FROM stdin;
4561d927-a159-4063-a5b2-8d0db9e98eac	2b4ac8a5-4423-442f-94ae-6564635aecb5	RESOLVED	MATCHED	100.000000000000000000	100.000000000000000000	0.000000000000000000	Verified transfer matches the expected payment.	2026-10-28 22:37:55.922507+00	\N
77099c27-e119-4f29-85fd-5821acf982b6	220774c6-2157-4a72-9e91-96a8052e0968	RESOLVED	MATCHED	50.000000000000000000	50.000000000000000000	0.000000000000000000	Verified transfer matches the expected payment.	2026-10-28 23:54:01.383397+00	2026-10-28 23:54:01.427333+00
b9e7a6cc-4c7f-4112-b7a0-334aae1f3014	7a0d2161-a867-4231-9da7-e61dd819885c	OPEN	DISCREPANCY	100.000000000000000000	80.000000000000000000	-20.000000000000000000	The transaction evidence does not fully match the expected payment.	2026-10-28 23:04:05.152793+00	\N
baecbf75-9952-44f3-85a2-1bc7487af587	0eac0269-f078-4660-a16f-019e395c4414	RESOLVED	DISCREPANCY	100.000000000000000000	50.000000000000000000	-50.000000000000000000	The transaction evidence does not fully match the expected payment.	2026-10-30 15:47:11.885398+00	2026-10-30 15:47:11.925343+00
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: evidence_records evidence_records_pkey; Type: CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.evidence_records
    ADD CONSTRAINT evidence_records_pkey PRIMARY KEY (id);


--
-- Name: investigation_reports investigation_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.investigation_reports
    ADD CONSTRAINT investigation_reports_pkey PRIMARY KEY (id);


--
-- Name: payments payments_external_reference_key; Type: CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_external_reference_key UNIQUE (external_reference);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_cases reconciliation_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.reconciliation_cases
    ADD CONSTRAINT reconciliation_cases_pkey PRIMARY KEY (id);


--
-- Name: evidence_records uq_evidence_chain_tx_log; Type: CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.evidence_records
    ADD CONSTRAINT uq_evidence_chain_tx_log UNIQUE (chain_id, transaction_hash, log_index);


--
-- Name: reconciliation_cases uq_reconciliation_cases_payment_id; Type: CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.reconciliation_cases
    ADD CONSTRAINT uq_reconciliation_cases_payment_id UNIQUE (payment_id);


--
-- Name: ix_audit_entity_created; Type: INDEX; Schema: public; Owner: chainguard_app
--

CREATE INDEX ix_audit_entity_created ON public.audit_events USING btree (entity_type, entity_id, created_at);


--
-- Name: ix_cases_status_created; Type: INDEX; Schema: public; Owner: chainguard_app
--

CREATE INDEX ix_cases_status_created ON public.reconciliation_cases USING btree (status, created_at);


--
-- Name: ix_evidence_transaction_hash; Type: INDEX; Schema: public; Owner: chainguard_app
--

CREATE INDEX ix_evidence_transaction_hash ON public.evidence_records USING btree (transaction_hash);


--
-- Name: ix_investigation_reports_case_created; Type: INDEX; Schema: public; Owner: chainguard_app
--

CREATE INDEX ix_investigation_reports_case_created ON public.investigation_reports USING btree (case_id, created_at);


--
-- Name: ix_payments_status_created; Type: INDEX; Schema: public; Owner: chainguard_app
--

CREATE INDEX ix_payments_status_created ON public.payments USING btree (status, created_at);


--
-- Name: evidence_records evidence_records_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.evidence_records
    ADD CONSTRAINT evidence_records_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.reconciliation_cases(id) ON DELETE RESTRICT;


--
-- Name: investigation_reports investigation_reports_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.investigation_reports
    ADD CONSTRAINT investigation_reports_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.reconciliation_cases(id) ON DELETE RESTRICT;


--
-- Name: reconciliation_cases reconciliation_cases_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: chainguard_app
--

ALTER TABLE ONLY public.reconciliation_cases
    ADD CONSTRAINT reconciliation_cases_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict eH7tA3AI288FKev0g6WWtGBtR6v4huRng8wmJkxgwEoaqDRWXMnxa7F1ZAfdZKE

