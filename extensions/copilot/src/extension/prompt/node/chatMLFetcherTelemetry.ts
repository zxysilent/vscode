/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ChatFetchError } from '../../../platform/chat/common/commonTypes';
import { isAutoModel } from '../../../platform/endpoint/node/autoChatEndpoint';
import { FetcherId } from '../../../platform/networking/common/fetcherService';
import { IChatEndpoint, IChatRequestTelemetryProperties, IEndpointBody } from '../../../platform/networking/common/networking';
import { ChatCompletion } from '../../../platform/networking/common/openai';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry';
import { TelemetryData } from '../../../platform/telemetry/common/telemetryData';
import { isBYOKModel } from '../../byok/node/openAIEndpoint';

export interface IChatMLFetcherSuccessfulData {
	chatCompletion: ChatCompletion;
	baseTelemetry: TelemetryData;
	userInitiatedRequest: boolean | undefined;
	interactionType: string;
	chatEndpointInfo: IChatEndpoint | undefined;
	requestBody: IEndpointBody;
	maxResponseTokens: number;
	promptTokenCount: number;
	timeToFirstToken: number;
	timeToFirstTokenEmitted: number;
	hasImageMessages: boolean;
	transport: string;
	fetcher: FetcherId | undefined;
	bytesReceived: number | undefined;
	suspendEventSeen: boolean | undefined;
	resumeEventSeen: boolean | undefined;
	modelCallId: string | undefined;
}

export interface IChatMLFetcherCancellationProperties {
	source: string;
	requestId: string;
	model: string;
	apiType: string | undefined;
	transport: string;
	interactionType: string;
	conversationId?: string;
	associatedRequestId?: string;
	parentRequestId?: string;
	retryAfterError?: string;
	retryAfterErrorGitHubRequestId?: string;
	connectivityTestError?: string;
	connectivityTestErrorGitHubRequestId?: string;
	retryAfterFilterCategory?: string;
	fetcher: FetcherId | undefined;
	suspendEventSeen: boolean | undefined;
	resumeEventSeen: boolean | undefined;
}

export interface IChatMLFetcherCancellationMeasures {
	totalTokenMax: number;
	promptTokenCount: number;
	tokenCountMax: number;
	timeToFirstToken: number | undefined;
	timeToFirstTokenEmitted?: number;
	timeToCancelled: number;
	isVisionRequest: number;
	isBYOK: number;
	isAuto: number;
	bytesReceived: number | undefined;
	issuedTime: number;
}

export interface IChatMLFetcherErrorData {
	processed: ChatFetchError;
	telemetryProperties: IChatRequestTelemetryProperties | undefined;
	chatEndpointInfo: IChatEndpoint;
	requestBody: IEndpointBody;
	tokenCount: number;
	maxResponseTokens: number;
	timeToFirstToken: number;
	isVisionRequest: boolean;
	transport: string;
	interactionType: string;
	fetcher: FetcherId | undefined;
	bytesReceived: number | undefined;
	issuedTime: number;
	wasRetried: boolean;
	suspendEventSeen: boolean | undefined;
	resumeEventSeen: boolean | undefined;
}

export class ChatMLFetcherTelemetrySender {

	public static sendSuccessTelemetry(
		telemetryService: ITelemetryService,
		{
			chatCompletion,
			baseTelemetry,
			userInitiatedRequest,
			interactionType,
			chatEndpointInfo,
			requestBody,
			maxResponseTokens,
			promptTokenCount,
			timeToFirstToken,
			timeToFirstTokenEmitted,
			hasImageMessages,
			transport,
			fetcher,
			bytesReceived,
			suspendEventSeen,
			resumeEventSeen,
			modelCallId,
		}: IChatMLFetcherSuccessfulData,
	) {
		telemetryService.sendTelemetryEvent('response.success', { github: true, microsoft: true }, {
			reason: chatCompletion.finishReason,
			filterReason: chatCompletion.filterReason,
			source: baseTelemetry?.properties.messageSource ?? 'unknown',
			initiatorType: userInitiatedRequest ? 'user' : 'agent',
			requestKind: interactionType,
			conversationId: baseTelemetry?.properties.conversationId,
			model: chatEndpointInfo?.model,
			modelInvoked: chatCompletion.model,
			apiType: chatEndpointInfo?.apiType,
			requestId: chatCompletion.requestId.headerRequestId,
			gitHubRequestId: chatCompletion.requestId.gitHubRequestId,
			associatedRequestId: baseTelemetry?.properties.associatedRequestId,
			parentRequestId: baseTelemetry?.properties.parentRequestId,
			reasoningEffort: requestBody.reasoning?.effort ?? requestBody.output_config?.effort,
			reasoningSummary: requestBody.reasoning?.summary,
			modelCallId,
			...(baseTelemetry?.properties.subType ? { subType: baseTelemetry.properties.subType } : {}),
			...(baseTelemetry?.properties.parentModelCallId ? { parentModelCallId: baseTelemetry.properties.parentModelCallId } : {}),
			...(baseTelemetry?.properties.iterationNumber ? { iterationNumber: baseTelemetry.properties.iterationNumber } : {}),
			...(fetcher ? { fetcher } : {}),
			transport,
			...(baseTelemetry?.properties.retryAfterError ? { retryAfterError: baseTelemetry.properties.retryAfterError } : {}),
			...(baseTelemetry?.properties.retryAfterErrorGitHubRequestId ? { retryAfterErrorGitHubRequestId: baseTelemetry.properties.retryAfterErrorGitHubRequestId } : {}),
			...(baseTelemetry?.properties.connectivityTestError ? { connectivityTestError: baseTelemetry.properties.connectivityTestError } : {}),
			...(baseTelemetry?.properties.connectivityTestErrorGitHubRequestId ? { connectivityTestErrorGitHubRequestId: baseTelemetry.properties.connectivityTestErrorGitHubRequestId } : {}),
			...(baseTelemetry?.properties.retryAfterFilterCategory ? { retryAfterFilterCategory: baseTelemetry.properties.retryAfterFilterCategory } : {}),
		}, {
			totalTokenMax: chatEndpointInfo?.modelMaxPromptTokens ?? -1,
			tokenCountMax: maxResponseTokens,
			promptTokenCount: chatCompletion.usage?.prompt_tokens,
			promptCacheTokenCount: chatCompletion.usage?.prompt_tokens_details?.cached_tokens,
			clientPromptTokenCount: promptTokenCount,
			tokenCount: chatCompletion.usage?.total_tokens,
			reasoningTokens: chatCompletion.usage?.completion_tokens_details?.reasoning_tokens,
			acceptedPredictionTokens: chatCompletion.usage?.completion_tokens_details?.accepted_prediction_tokens,
			rejectedPredictionTokens: chatCompletion.usage?.completion_tokens_details?.rejected_prediction_tokens,
			completionTokens: chatCompletion.usage?.completion_tokens,
			timeToFirstToken,
			timeToFirstTokenEmitted,
			timeToComplete: Date.now() - baseTelemetry.issuedTime,
			issuedTime: baseTelemetry.issuedTime,
			isVisionRequest: hasImageMessages ? 1 : -1,
			isBYOK: isBYOKModel(chatEndpointInfo),
			isAuto: isAutoModel(chatEndpointInfo),
			bytesReceived,
			suspendEventSeen: suspendEventSeen ? 1 : 0,
			resumeEventSeen: resumeEventSeen ? 1 : 0,
		});
	}

	public static sendCancellationTelemetry(
		telemetryService: ITelemetryService,
		{
			source,
			requestId,
			model,
			apiType,
			transport,
			interactionType,
			conversationId,
			associatedRequestId,
			parentRequestId,
			retryAfterError,
			retryAfterErrorGitHubRequestId,
			connectivityTestError,
			connectivityTestErrorGitHubRequestId,
			retryAfterFilterCategory,
			fetcher,
			suspendEventSeen,
			resumeEventSeen,
		}: IChatMLFetcherCancellationProperties,
		{
			totalTokenMax,
			promptTokenCount,
			tokenCountMax,
			timeToFirstToken,
			timeToFirstTokenEmitted,
			timeToCancelled,
			isVisionRequest,
			isBYOK,
			isAuto,
			bytesReceived,
			issuedTime,
		}: IChatMLFetcherCancellationMeasures
	) {
		telemetryService.sendTelemetryEvent('response.cancelled', { github: true, microsoft: true }, {
			apiType,
			source,
			requestId,
			model,
			requestKind: interactionType,
			conversationId,
			associatedRequestId,
			parentRequestId,
			...(fetcher ? { fetcher } : {}),
			transport,
			...(retryAfterError ? { retryAfterError } : {}),
			...(retryAfterErrorGitHubRequestId ? { retryAfterErrorGitHubRequestId } : {}),
			...(connectivityTestError ? { connectivityTestError } : {}),
			...(connectivityTestErrorGitHubRequestId ? { connectivityTestErrorGitHubRequestId } : {}),
			...(retryAfterFilterCategory ? { retryAfterFilterCategory } : {})
		}, {
			totalTokenMax,
			promptTokenCount,
			tokenCountMax,
			timeToFirstToken,
			timeToFirstTokenEmitted,
			timeToCancelled,
			timeToComplete: timeToCancelled,
			issuedTime,
			isVisionRequest,
			isBYOK,
			isAuto,
			bytesReceived,
			suspendEventSeen: suspendEventSeen ? 1 : 0,
			resumeEventSeen: resumeEventSeen ? 1 : 0,
		});
	}

	public static sendResponseErrorTelemetry(
		telemetryService: ITelemetryService,
		{
			processed,
			telemetryProperties,
			chatEndpointInfo,
			requestBody,
			tokenCount,
			maxResponseTokens,
			timeToFirstToken,
			isVisionRequest,
			transport,
			interactionType,
			fetcher,
			bytesReceived,
			issuedTime,
			wasRetried,
			suspendEventSeen,
			resumeEventSeen,
		}: IChatMLFetcherErrorData,
	) {
		telemetryService.sendTelemetryEvent('response.error', { github: true, microsoft: true }, {
			type: processed.type,
			reason: processed.reasonDetail || processed.reason,
			source: telemetryProperties?.messageSource ?? 'unknown',
			requestKind: interactionType,
			requestId: processed.requestId,
			gitHubRequestId: processed.serverRequestId,
			model: chatEndpointInfo.model,
			apiType: chatEndpointInfo.apiType,
			conversationId: telemetryProperties?.conversationId,
			reasoningEffort: requestBody.reasoning?.effort ?? requestBody.output_config?.effort,
			reasoningSummary: requestBody.reasoning?.summary,
			...(fetcher ? { fetcher } : {}),
			transport,
			associatedRequestId: telemetryProperties?.associatedRequestId,
			parentRequestId: telemetryProperties?.parentRequestId,
			...(telemetryProperties?.retryAfterError ? { retryAfterError: telemetryProperties.retryAfterError } : {}),
			...(telemetryProperties?.retryAfterErrorGitHubRequestId ? { retryAfterErrorGitHubRequestId: telemetryProperties.retryAfterErrorGitHubRequestId } : {}),
			...(telemetryProperties?.connectivityTestError ? { connectivityTestError: telemetryProperties.connectivityTestError } : {}),
			...(telemetryProperties?.connectivityTestErrorGitHubRequestId ? { connectivityTestErrorGitHubRequestId: telemetryProperties.connectivityTestErrorGitHubRequestId } : {}),
			...(telemetryProperties?.retryAfterFilterCategory ? { retryAfterFilterCategory: telemetryProperties.retryAfterFilterCategory } : {})
		}, {
			totalTokenMax: chatEndpointInfo.modelMaxPromptTokens ?? -1,
			promptTokenCount: tokenCount,
			tokenCountMax: maxResponseTokens,
			timeToFirstToken,
			timeToComplete: Date.now() - issuedTime,
			issuedTime,
			isVisionRequest: isVisionRequest ? 1 : -1,
			isBYOK: isBYOKModel(chatEndpointInfo),
			isAuto: isAutoModel(chatEndpointInfo),
			wasRetried: wasRetried ? 1 : 0,
			bytesReceived,
			suspendEventSeen: suspendEventSeen ? 1 : 0,
			resumeEventSeen: resumeEventSeen ? 1 : 0,
		});
	}
}
