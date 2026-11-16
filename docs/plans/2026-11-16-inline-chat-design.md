# Unified landing input

Keep the existing monochrome landing console. Four quick navigation links appear
above the input at rest. While typing, search suggestion chips replace those
buttons. Project results appear in a separate box above the chips; loading and
empty/error feedback use that box. Hide the introductory text while discovering.
The result box fits its content up to 260px (less on smaller screens), then
scrolls. Keep the input stationary and the hovered or focused project's 3D
preview visible. Reuse the existing search and project-results components.

Enter first resolves explicit navigation commands, exact project names and exact
suggestion labels. Clicking a suggestion selects its filter and returns focus to
the input; Enter opens the project view filtered by the selected named facet. Only unmatched submitted text calls the bounded assistant.
A discovery API failure does not disable the separate assistant backend.

In chat mode the whole section becomes the conversation, including removal of
quick navigation. The transcript appears above the shared input, and the page
grows naturally with messages. Keep the composer sticky near the viewport bottom
within the conversation. The same input submits subsequent questions. Close chat
restores the default landing; clicking/focusing the input resumes saved history.
Clear chat erases it. The last five completed exchanges persist in tab-scoped
session storage for two hours after the last completed answer; opening or reading
them does not extend expiry. Restore bounded text and allowlisted localized
project/case-study citations and page actions. Handle unavailable storage and
ignore late responses after clearing or unmounting. Each question remains an
independent model request; prior messages are not sent to the provider.

Keep source links, validated actions, cancellation, quota errors and privacy copy.
English/German notices must describe the actual data flow and local retention.
Production publication remains blocked on the outstanding provider/account,
contract/transfer and host configuration checks documented in the privacy review.

Verify behavior in the browser: typing does not call the model; exact matches
navigate without paid calls; unmatched questions call it; chat replaces discovery;
Close and Clear differ; navigation/reload restore messages on input activation;
case-study citations survive restoration; one composer remains. Check placement
and viewport fit visually rather than through style assertions.
